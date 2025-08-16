import OpenAI from 'openai';

const openaiApiKey = import.meta.env.VITE_OPENAI_API_KEY;

// Check if we have a valid API key (not empty, not the placeholder, and not undefined)
const hasValidKey = openaiApiKey && 
  openaiApiKey !== 'your_openai_api_key_here' && 
  openaiApiKey !== 'sk-your-openai-api-key' &&
  openaiApiKey !== 'sk-placeholder-key-for-development' &&
  openaiApiKey.trim() !== '';

// Initialize OpenAI client only if we have a valid key
const openai = hasValidKey ? new OpenAI({
  apiKey: openaiApiKey,
  dangerouslyAllowBrowser: true
}) : null;

export type AIModel = {
  id: string;
  name: string;
  provider: 'openai';
  contextLength: number;
  costPer1kTokens: number;
  description: string;
};

export const availableModels: AIModel[] = [
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'openai',
    contextLength: 128000,
    costPer1kTokens: 0.005,
    description: 'Latest GPT-4 model with improved capabilities and lower cost'
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'openai',
    contextLength: 128000,
    costPer1kTokens: 0.00015,
    description: 'Fast and efficient GPT-4 model for general tasks'
  },
  {
    id: 'gpt-4-turbo',
    name: 'GPT-4 Turbo',
    provider: 'openai',
    contextLength: 128000,
    costPer1kTokens: 0.01,
    description: 'Powerful GPT-4 model with large context window'
  },
  {
    id: 'gpt-4',
    name: 'GPT-4',
    provider: 'openai',
    contextLength: 8192,
    costPer1kTokens: 0.03,
    description: 'Highly capable model for complex reasoning tasks'
  },
  {
    id: 'gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo',
    provider: 'openai',
    contextLength: 16385,
    costPer1kTokens: 0.0005,
    description: 'Fast and cost-effective for general tasks'
  }
];

export const defaultModel = 'gpt-4o-mini';

// Function to get the current selected model from the store
let getSelectedModel: (() => string) | null = null;

export const setModelSelector = (selector: () => string) => {
  getSelectedModel = selector;
};

export class AIService {
  constructor() {
    if (!hasValidKey) {
      console.warn('OpenAI API key not configured. AI features will be disabled.');
    }
  }

  private getModel(): string {
    // Use the selected model from store if available, otherwise fall back to default
    return getSelectedModel ? getSelectedModel() : defaultModel;
  }

  async analyzeCase(caseData: any, query?: string): Promise<any> {
    if (!openai) {
      return {
        insights: 'AI analysis is not available. Please check your OpenAI API configuration.',
        recommendations: [],
        riskAssessment: 'Unable to assess risk without AI service.',
        nextSteps: []
      };
    }

    try {
      const prompt = `
You are an expert RTW (Return to Work) Case Manager with extensive experience in workers' compensation, occupational health, and rehabilitation.

Case Information:
${JSON.stringify(caseData, null, 2)}

${query ? `User Query: ${query}` : ''}

Please provide:
1. Key insights about this case
2. Specific recommendations for RTW management
3. Risk assessment and potential barriers
4. Next steps and action items
5. Compliance considerations for WorkCover requirements

Focus on practical, actionable advice that a case manager can implement immediately.
      `;

      const completion = await openai.chat.completions.create({
        model: this.getModel(),
        messages: [
          {
            role: 'system',
            content: 'You are an expert RTW Case Manager with 20+ years of experience in workers compensation, occupational health, and rehabilitation. Provide practical, actionable advice based on Australian WorkCover standards and best practices.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 1000,
        temperature: 0.3
      });

      const response = completion.choices[0]?.message?.content || 'No response generated';

      return {
        insights: response,
        recommendations: this.extractRecommendations(response),
        riskAssessment: this.extractRiskAssessment(response),
        nextSteps: this.extractNextSteps(response)
      };
    } catch (error) {
      console.error('Error analyzing case:', error);
      return {
        insights: 'Error analyzing case. Please try again.',
        recommendations: [],
        riskAssessment: 'Unable to assess risk.',
        nextSteps: []
      };
    }
  }

  async chatWithRTWExpert(userMessage: string, caseContext?: any): Promise<string> {
    if (!openai) {
      return 'I apologize, but I am currently unable to provide AI-powered responses. Please check your OpenAI API configuration or contact support.';
    }

    try {
      const systemPrompt = `You are an expert RTW (Return to Work) Case Manager with extensive experience in Australian workers' compensation, occupational health, and rehabilitation. You have deep knowledge of:

- WorkCover legislation and compliance requirements
- RTW planning and implementation strategies
- Medical certificate analysis and interpretation
- Stakeholder management and communication
- Risk assessment and barrier identification
- Compensation calculations and PIAWE
- Review date scheduling and management
- Document management and compliance
- Occupational health and safety best practices

Provide practical, actionable advice based on Australian standards and best practices. Be concise but comprehensive. If asked about specific cases, use the provided context to give targeted recommendations.`;

      const contextPrompt = caseContext ? `
Current Case Context:
${JSON.stringify(caseContext, null, 2)}

User Question: ${userMessage}

Please provide specific, actionable advice for this case.` : `
User Question: ${userMessage}

Please provide general RTW management guidance and best practices.`;

      const completion = await openai.chat.completions.create({
        model: this.getModel(),
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: contextPrompt
          }
        ],
        max_tokens: 800,
        temperature: 0.3
      });

      return completion.choices[0]?.message?.content || 'I apologize, but I was unable to generate a response. Please try again.';
    } catch (error) {
      console.error('Error in RTW chat:', error);
      return 'I apologize, but I encountered an error processing your request. Please try again or contact support if the issue persists.';
    }
  }

  async analyzeDocument(documentContent: string, documentType: string): Promise<any> {
    if (!openai) {
      return {
        insights: 'AI analysis is not available. Please check your OpenAI API configuration.',
        summary: 'Unable to analyze document without AI service.',
        keyPoints: [],
        recommendations: []
      };
    }

    try {
      const prompt = `
You are an expert RTW Case Manager analyzing a ${documentType} document. Please provide:

1. A concise summary of the key information
2. Important points that require attention
3. Recommendations for next steps
4. Any compliance or risk considerations

Document Content:
${documentContent}

Please format your response clearly and provide actionable insights.
      `;

      const completion = await openai.chat.completions.create({
        model: this.getModel(),
        messages: [
          {
            role: 'system',
            content: 'You are an expert RTW Case Manager with deep knowledge of workers compensation, medical documentation, and compliance requirements. Provide clear, actionable analysis.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 600,
        temperature: 0.2
      });

      const response = completion.choices[0]?.message?.content || 'No analysis generated';

      return {
        insights: response,
        summary: this.extractSummary(response),
        keyPoints: this.extractKeyPoints(response),
        recommendations: this.extractRecommendations(response)
      };
    } catch (error) {
      console.error('Error analyzing document:', error);
      return {
        insights: 'Error analyzing document. Please try again.',
        summary: 'Unable to generate summary.',
        keyPoints: [],
        recommendations: []
      };
    }
  }

  // Helper methods for extracting structured information from AI responses
  private extractRecommendations(response: string): string[] {
    const recommendations = response.match(/recommendations?[:\s]+(.*?)(?=\n\n|\n[A-Z]|$)/is);
    if (!recommendations) return [];
    
    return recommendations[1]
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && (line.startsWith('•') || line.startsWith('-') || line.startsWith('*') || line.startsWith('1.') || line.startsWith('2.') || line.startsWith('3.')))
      .map(line => line.replace(/^[•\-*1-9\.]\s*/, '').trim())
      .filter(Boolean);
  }

  private extractRiskAssessment(response: string): string {
    const riskMatch = response.match(/risk assessment[:\s]+(.*?)(?=\n\n|\n[A-Z]|$)/is);
    return riskMatch ? riskMatch[1].trim() : 'Risk assessment not provided';
  }

  private extractNextSteps(response: string): string[] {
    const nextSteps = response.match(/next steps?[:\s]+(.*?)(?=\n\n|\n[A-Z]|$)/is);
    if (!nextSteps) return [];
    
    return nextSteps[1]
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && (line.startsWith('•') || line.startsWith('-') || line.startsWith('*') || line.startsWith('1.') || line.startsWith('2.') || line.startsWith('3.')))
      .map(line => line.replace(/^[•\-*1-9\.]\s*/, '').trim())
      .filter(Boolean);
  }

  private extractSummary(response: string): string {
    const summaryMatch = response.match(/summary[:\s]+(.*?)(?=\n\n|\n[A-Z]|$)/is);
    return summaryMatch ? summaryMatch[1].trim() : 'Summary not provided';
  }

  private extractKeyPoints(response: string): string[] {
    const keyPoints = response.match(/key points?[:\s]+(.*?)(?=\n\n|\n[A-Z]|$)/is);
    if (!keyPoints) return [];
    
    return keyPoints[1]
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && (line.startsWith('•') || line.startsWith('-') || line.startsWith('*') || line.startsWith('1.') || line.startsWith('2.') || line.startsWith('3.')))
      .map(line => line.replace(/^[•\-*1-9\.]\s*/, '').trim())
      .filter(Boolean);
  }
}

export const aiService = new AIService();