import React, { useState } from 'react';
import Modal from '../common/Modal';
import { Worker, Stakeholder, Employer } from '../../types';
import { useAuthStore } from '../../store/authStore';

interface EmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  worker: Worker;
  employer: Employer;
  stakeholders: Stakeholder[];
}

const EmailModal: React.FC<EmailModalProps> = ({ isOpen, onClose, worker, employer, stakeholders }) => {
  const { user } = useAuthStore();
  const allContacts = [
    { label: `${worker.firstName} ${worker.lastName} (Worker)`, email: worker.email },
    ...(employer.email ? [{ label: `${employer.name} (Employer)`, email: employer.email }] : []),
    ...stakeholders
      .filter(s => s.email)
      .map(s => ({ label: `${s.name} (${s.type})`, email: s.email! }))
  ];

  const [selectedEmails, setSelectedEmails] = useState<string[]>(allContacts.map(c => c.email));
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleToggleEmail = (email: string) => {
    setSelectedEmails(prev =>
      prev.includes(email) ? prev.filter(e => e !== email) : [...prev, email]
    );
  };

  const handleSend = async () => {
    setSending(true);
    setMessage(null);
    try {
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          to: selectedEmails,
          subject,
          body,
        }),
      });
      if (!res.ok) throw new Error('Failed to send email');
      setMessage('Email sent!');
      setTimeout(() => {
        setMessage(null);
        onClose();
      }, 1200);
    } catch (err: any) {
      setMessage('Error: ' + (err.message || 'Failed to send email'));
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Send Email to Case Contacts">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
          <div className="flex flex-wrap gap-2 mb-2">
            {allContacts.map(contact => (
              <label key={contact.email} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={selectedEmails.includes(contact.email)}
                  onChange={() => handleToggleEmail(contact.email)}
                  className="form-checkbox h-4 w-4 text-primary-600"
                />
                <span className="text-sm">{contact.label} &lt;{contact.email}&gt;</span>
              </label>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
          <input
            type="text"
            value={subject}
            onChange={e => setSubject(e.target.value)}
            className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2"
            placeholder="Subject"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Body</label>
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2"
            rows={6}
            placeholder="Write your message here..."
          />
        </div>
        <div className="flex justify-end space-x-2 mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 border border-gray-300 rounded-md"
            disabled={sending}
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={selectedEmails.length === 0 || sending}
            className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? 'Sending...' : 'Send'}
          </button>
        </div>
        {message && <div className="text-center text-primary-700 mt-2">{message}</div>}
      </div>
    </Modal>
  );
};

export default EmailModal; 