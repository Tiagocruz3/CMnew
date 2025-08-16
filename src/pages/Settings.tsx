import React, { useState, useEffect } from 'react';
import { User, Shield, Bell, Palette, Database, Brain, CheckCircle, XCircle, AlertTriangle, RefreshCw, Info, Zap, Settings as SettingsIcon } from 'lucide-react';
import { useAISettingsStore } from '../store/aiSettingsStore';
import { setModelSelector } from '../services/aiService';

const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState('profile');
  const {
    selectedModel,
    availableModels,
    isConnected,
    connectionStatus,
    lastConnectionCheck,
    errorMessage,
    setSelectedModel,
    checkConnection,
    refreshModels
  } = useAISettingsStore();

  useEffect(() => {
    // Set up the model selector for the AI service
    setModelSelector(() => selectedModel);
    
    // Check connection on component mount
    console.log('Settings mounted, checking AI connection...');
    checkConnection();
  }, []); // Remove dependencies to avoid infinite loops

  // Separate effect for model selection
  useEffect(() => {
    setModelSelector(() => selectedModel);
  }, [selectedModel]);

  const tabs = [
    { id: 'profile', name: 'Profile', icon: User, component: null },
    { id: 'security', name: 'Security', icon: Shield, component: null },
    { id: 'notifications', name: 'Notifications', icon: Bell, component: null },
    { id: 'appearance', name: 'Appearance', icon: Palette, component: null },
    { id: 'data', name: 'Data & Storage', icon: Database, component: null },
  ];

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'disconnected':
        return <XCircle className="h-5 w-5 text-gray-400" />;
      case 'checking':
        return <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />;
      case 'error':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      default:
        return <XCircle className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'Connected to OpenAI API';
      case 'disconnected':
        return 'Not connected';
      case 'checking':
        return 'Checking connection...';
      case 'error':
        return 'Connection error';
      default:
        return 'Unknown status';
    }
  };

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'disconnected':
        return 'text-gray-600 bg-gray-50 border-gray-200';
      case 'checking':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'error':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const formatCost = (cost: number) => {
    if (cost < 0.001) {
      return `$${(cost * 1000).toFixed(3)} per 1K tokens`;
    }
    return `$${cost.toFixed(3)} per 1K tokens`;
  };

  const formatContextLength = (length: number) => {
    if (length >= 1000000) {
      return `${(length / 1000000).toFixed(1)}M tokens`;
    } else if (length >= 1000) {
      return `${(length / 1000).toFixed(0)}K tokens`;
    }
    return `${length} tokens`;
  };

  const renderTabContent = () => {
    const activeTabData = tabs.find(tab => tab.id === activeTab);
    if (activeTabData?.component) {
      return <activeTabData.component />;
    }
    
    return (
      <div className="text-center py-12">
        <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          {activeTabData?.icon && <activeTabData.icon className="w-12 h-12 text-gray-400" />}
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">{activeTabData?.name}</h3>
        <p className="text-gray-500">This section is under development.</p>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-4">
        <h1 className="text-2xl font-bold text-gray-900 pb-4">Settings</h1>
      </div>

      {/* AI Configuration Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="border-b border-gray-200 pb-4 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <Brain className="h-5 w-5 mr-2 text-primary-600" />
            AI Configuration
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Configure OpenAI API settings and select AI models for RTW case management features.
          </p>
        </div>

        {/* Connection Status */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-md font-medium text-gray-900">API Connection Status</h3>
            <button
              onClick={checkConnection}
              disabled={connectionStatus === 'checking'}
              className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`h-4 w-4 mr-1.5 ${connectionStatus === 'checking' ? 'animate-spin' : ''}`} />
              {connectionStatus === 'checking' ? 'Checking...' : 'Check Connection'}
            </button>
          </div>

          <div className={`inline-flex items-center px-3 py-2 rounded-full border ${getStatusColor()}`}>
            {getStatusIcon()}
            <span className="ml-2 text-sm font-medium">{getStatusText()}</span>
          </div>

          {lastConnectionCheck && (
            <p className="text-xs text-gray-500 mt-2">
              Last checked: {lastConnectionCheck.toLocaleString()}
            </p>
          )}

          {errorMessage && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-700">{errorMessage}</p>
            </div>
          )}

          {!isConnected && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
              <div className="flex">
                <Info className="h-5 w-5 text-yellow-400 mr-2 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-yellow-800">Setup Required</h4>
                  <p className="text-sm text-yellow-700 mt-1">
                    To use AI features, you need to configure your OpenAI API key. Create a <code className="bg-yellow-100 px-1 py-0.5 rounded text-xs">.env</code> file in your project root and add:
                  </p>
                  <code className="block mt-2 bg-yellow-100 px-2 py-1 rounded text-xs font-mono">
                    VITE_OPENAI_API_KEY=sk-your-actual-api-key-here
                  </code>
                  <p className="text-sm text-yellow-700 mt-2">
                    Get your API key from the <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="underline hover:text-yellow-800">OpenAI Platform</a>.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Model Selection */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-md font-medium text-gray-900">AI Model Selection</h3>
            <button
              onClick={refreshModels}
              className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              <RefreshCw className="h-4 w-4 mr-1.5" />
              Refresh
            </button>
          </div>

          <p className="text-sm text-gray-600 mb-4">
            Select the AI model to use for all AI-powered features. The selected model will be used for:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            <div className="flex items-center text-sm text-gray-600">
              <Brain className="h-4 w-4 mr-2 text-primary-600" />
              AI Chatbot responses
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <Zap className="h-4 w-4 mr-2 text-primary-600" />
              Case analysis and insights
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <SettingsIcon className="h-4 w-4 mr-2 text-primary-600" />
              Document analysis
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <Info className="h-4 w-4 mr-2 text-primary-600" />
              RTW guidance and recommendations
            </div>
          </div>

          <div className="space-y-3">
            {availableModels.map((model) => (
              <label
                key={model.id}
                className={`relative flex items-start p-4 border rounded-lg cursor-pointer transition-colors ${
                  selectedModel === model.id
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="model"
                  value={model.id}
                  checked={selectedModel === model.id}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="sr-only"
                />
                
                <div className="flex items-center h-5 mt-0.5">
                  <div className={`w-4 h-4 border-2 rounded-full ${
                    selectedModel === model.id
                      ? 'border-primary-500 bg-primary-500'
                      : 'border-gray-300'
                  }`}>
                    {selectedModel === model.id && (
                      <div className="w-2 h-2 bg-white rounded-full m-0.5" />
                    )}
                  </div>
                </div>

                <div className="ml-3 flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{model.name}</p>
                      <p className="text-xs text-gray-500 mt-1">{model.description}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-medium text-gray-900">{formatCost(model.costPer1kTokens)}</p>
                      <p className="text-xs text-gray-500">{formatContextLength(model.contextLength)}</p>
                    </div>
                  </div>

                  {model.id === 'gpt-4o-mini' && (
                    <div className="mt-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Recommended (Best value)
                    </div>
                  )}
                </div>
              </label>
            ))}
          </div>

          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <div className="flex">
              <Info className="h-5 w-5 text-blue-400 mr-2 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-blue-800">Cost Information</h4>
                <p className="text-sm text-blue-700 mt-1">
                  AI interactions are charged per token (word/piece of text). Most conversations cost less than $0.01. 
                  GPT-4o Mini offers the best balance of performance and cost for RTW case management.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Current Usage Info */}
        {isConnected && (
          <div>
            <h3 className="text-md font-medium text-gray-900 mb-4">Current Configuration</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-700">Selected Model</p>
                <p className="text-sm text-gray-900 mt-1">
                  {availableModels.find(m => m.id === selectedModel)?.name || selectedModel}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Provider</p>
                <p className="text-sm text-gray-900 mt-1">OpenAI</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Context Length</p>
                <p className="text-sm text-gray-900 mt-1">
                  {formatContextLength(availableModels.find(m => m.id === selectedModel)?.contextLength || 0)}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Cost per 1K Tokens</p>
                <p className="text-sm text-gray-900 mt-1">
                  {formatCost(availableModels.find(m => m.id === selectedModel)?.costPer1kTokens || 0)}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex space-x-8">
        {/* Sidebar */}
        <div className="w-64 flex-shrink-0">
          <nav className="space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    activeTab === tab.id
                      ? 'bg-primary-100 text-primary-700 border-r-2 border-primary-600'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="mr-3 h-5 w-5" />
                  {tab.name}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
};

export default Settings;