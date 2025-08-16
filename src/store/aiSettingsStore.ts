import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { availableModels, defaultModel, type AIModel } from '../services/aiService';

interface AISettingsState {
  selectedModel: string;
  availableModels: AIModel[];
  isConnected: boolean;
  connectionStatus: 'connected' | 'disconnected' | 'checking' | 'error';
  lastConnectionCheck: Date | null;
  errorMessage: string | null;
  
  // Actions
  setSelectedModel: (modelId: string) => void;
  setConnectionStatus: (status: 'connected' | 'disconnected' | 'checking' | 'error') => void;
  setErrorMessage: (message: string | null) => void;
  checkConnection: () => Promise<void>;
  refreshModels: () => void;
}

export const useAISettingsStore = create<AISettingsState>()(
  persist(
    (set, get) => ({
      selectedModel: defaultModel,
      availableModels: availableModels,
      isConnected: false,
      connectionStatus: 'disconnected',
      lastConnectionCheck: null,
      errorMessage: null,

      setSelectedModel: (modelId: string) => {
        set({ selectedModel: modelId });
      },

      setConnectionStatus: (status: 'connected' | 'disconnected' | 'checking' | 'error') => {
        set({ 
          connectionStatus: status,
          isConnected: status === 'connected',
          lastConnectionCheck: new Date()
        });
      },

      setErrorMessage: (message: string | null) => {
        set({ errorMessage: message });
      },

      checkConnection: async () => {
        console.log('Starting connection check...');
        set({ connectionStatus: 'checking', errorMessage: null });
        
        try {
          const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
          console.log('API Key found:', apiKey ? 'Yes' : 'No');
          
          if (!apiKey || 
              apiKey === 'your_openai_api_key_here' || 
              apiKey === 'sk-your-openai-api-key' ||
              apiKey === 'sk-placeholder-key-for-development' ||
              apiKey.trim() === '') {
            console.log('Invalid API key format');
            set({ 
              connectionStatus: 'error',
              errorMessage: 'OpenAI API key not configured. Please add VITE_OPENAI_API_KEY to your .env file.',
              isConnected: false
            });
            return;
          }

          console.log('Testing API connection...');
          
          // Test the connection by making a simple API call
          const response = await fetch('https://api.openai.com/v1/models', {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json'
            }
          });

          console.log('API Response status:', response.status);

          if (response.ok) {
            const data = await response.json();
            console.log('Connection successful, models available:', data.data?.length || 0);
            set({ 
              connectionStatus: 'connected',
              isConnected: true,
              errorMessage: null,
              lastConnectionCheck: new Date()
            });
          } else if (response.status === 401) {
            console.log('Authentication failed');
            set({ 
              connectionStatus: 'error',
              errorMessage: 'Invalid API key. Please check your OpenAI API key.',
              isConnected: false
            });
          } else if (response.status === 429) {
            console.log('Rate limit exceeded');
            set({ 
              connectionStatus: 'error',
              errorMessage: 'Rate limit exceeded. Please try again later.',
              isConnected: false
            });
          } else {
            console.log('API error:', response.status, response.statusText);
            set({ 
              connectionStatus: 'error',
              errorMessage: `API error: ${response.status} ${response.statusText}`,
              isConnected: false
            });
          }
        } catch (error) {
          console.error('Connection check failed:', error);
          set({ 
            connectionStatus: 'error',
            errorMessage: error instanceof Error ? error.message : 'Connection check failed',
            isConnected: false
          });
        }
      },

      refreshModels: () => {
        set({ availableModels: availableModels });
      }
    }),
    {
      name: 'ai-settings',
      partialize: (state) => ({ 
        selectedModel: state.selectedModel 
      })
    }
  )
);