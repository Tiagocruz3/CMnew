require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'changemechangeme12'; // 16/24/32 chars
const IV_LENGTH = 16;

function encrypt(text) {
  let iv = crypto.randomBytes(IV_LENGTH);
  let cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(text) {
  let parts = text.split(':');
  let iv = Buffer.from(parts.shift(), 'hex');
  let encryptedText = Buffer.from(parts.join(':'), 'hex');
  let decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}

// Save/update SMTP settings (admin only)
app.post('/api/email-settings', async (req, res) => {
  const { userId, smtpServer, port, email, username, password, useSSL } = req.body;
  const passwordEncrypted = encrypt(password);
  await pool.query(
    `INSERT INTO user_email_settings (user_id, smtp_server, port, email, username, password_encrypted, use_ssl)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (user_id) DO UPDATE SET
       smtp_server = EXCLUDED.smtp_server,
       port = EXCLUDED.port,
       email = EXCLUDED.email,
       username = EXCLUDED.username,
       password_encrypted = EXCLUDED.password_encrypted,
       use_ssl = EXCLUDED.use_ssl,
       updated_at = NOW()`,
    [userId, smtpServer, port, email, username, passwordEncrypted, useSSL]
  );
  res.json({ message: 'Settings saved' });
});

// Get SMTP settings (admin or self)
app.get('/api/email-settings/:userId', async (req, res) => {
  const { userId } = req.params;
  const { rows } = await pool.query(
    'SELECT smtp_server, port, email, username, use_ssl FROM user_email_settings WHERE user_id = $1',
    [userId]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
  res.json(rows[0]);
});

// Send email using stored SMTP settings
app.post('/api/send-email', async (req, res) => {
  const { userId, to, subject, body } = req.body;
  const { rows } = await pool.query(
    'SELECT * FROM user_email_settings WHERE user_id = $1',
    [userId]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'No SMTP settings' });
  const settings = rows[0];
  const password = decrypt(settings.password_encrypted);
  const transporter = nodemailer.createTransport({
    host: settings.smtp_server,
    port: settings.port,
    secure: settings.use_ssl,
    auth: {
      user: settings.username,
      pass: password,
    },
  });
  await transporter.sendMail({
    from: settings.email,
    to,
    subject,
    text: body,
  });
  res.json({ message: 'Email sent' });
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Email server running on port ${PORT}`)); 