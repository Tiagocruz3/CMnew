# AI Features Setup Guide

## OpenAI API Configuration

The RTW Case Manager now uses OpenAI's API directly for AI-powered features including:
- AI Chatbot (bottom right of screen)
- AI Insights for cases
- Document analysis
- RTW management guidance

### Setup Steps:

1. **Get OpenAI API Key**
   - Go to [OpenAI Platform](https://platform.openai.com/api-keys)
   - Sign in or create an account
   - Click "Create new secret key"
   - Copy your API key

2. **Configure Environment Variable**
   - Create a `.env` file in your project root (if it doesn't exist)
   - Add your OpenAI API key:
   ```
   VITE_OPENAI_API_KEY=sk-your-actual-api-key-here
   ```
   - Replace `sk-your-actual-api-key-here` with your actual API key

3. **Restart Development Server**
   - Stop your current dev server (`Ctrl+C`)
   - Run `npm run dev` again

### Available AI Models:

- **GPT-4o Mini** (Default) - Fast, efficient, cost-effective
- **GPT-4o** - Latest model with improved capabilities
- **GPT-4 Turbo** - Powerful with large context window
- **GPT-4** - Highly capable for complex reasoning
- **GPT-3.5 Turbo** - Fast and cost-effective

### Cost Information:

- **GPT-4o Mini**: $0.00015 per 1K tokens (very affordable)
- **GPT-4o**: $0.005 per 1K tokens
- **GPT-4 Turbo**: $0.01 per 1K tokens
- **GPT-4**: $0.03 per 1K tokens
- **GPT-3.5 Turbo**: $0.0005 per 1K tokens

### Features:

#### AI Chatbot
- Context-aware responses based on current case/page
- Navigation assistance
- RTW management guidance
- Case-specific information

#### AI Insights
- Case analysis and risk assessment
- Recommendations for RTW management
- Compliance guidance
- Best practices suggestions

#### Document Analysis
- Medical certificate interpretation
- Key information extraction
- Compliance checking
- Action item identification

### Troubleshooting:

- **"AI analysis is not available"**: Check your API key configuration
- **Rate limit errors**: OpenAI has usage limits based on your account tier
- **Authentication errors**: Verify your API key is correct and active

### Security Notes:

- Never commit your `.env` file to version control
- The API key is only used client-side for AI features
- All AI interactions are processed through OpenAI's secure API
- No case data is stored by OpenAI (only processed for responses)

### Support:

If you encounter issues with AI features:
1. Check your API key is correctly configured
2. Verify your OpenAI account has available credits
3. Check the browser console for error messages
4. Ensure your `.env` file is in the project root directory
