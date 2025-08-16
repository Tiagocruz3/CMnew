import React, { useState } from 'react';
import { Brain, Zap, AlertTriangle, CheckCircle, Clock, Info, Settings, X, RefreshCw, Target, Shield, TrendingUp, Calendar, Users, FileText, AlertCircle, Lightbulb, ArrowRight } from 'lucide-react';
import { aiService } from '../../services/aiService';
import { useAISettingsStore } from '../../store/aiSettingsStore';
import { useNavigate } from 'react-router-dom';

interface AIInsightsProps {
  caseData: any;
  onClose?: () => void;
}

// Helper function to safely render content that might be string or array
const renderContent = (content: any, fallbackText: string) => {
  if (Array.isArray(content)) {
    if (content.length === 0) {
      return <p className="text-gray-600 italic">{fallbackText}</p>;
    }
    return content.map((item: string, index: number) => (
      <div key={index} className="flex items-start">
        <div className="w-2 h-2 bg-current rounded-full mt-3 mr-4 flex-shrink-0" />
        <p className="text-lg leading-relaxed">{item}</p>
      </div>
    ));
  } else if (typeof content === 'string' && content.trim()) {
    // If it's a string, split by newlines and render as list items
    const lines = content.split('\n').filter(line => line.trim());
    if (lines.length === 0) {
      return <p className="text-gray-600 italic">{fallbackText}</p>;
    }
    return lines.map((line: string, index: number) => (
      <div key={index} className="flex items-start">
        <div className="w-2 h-2 bg-current rounded-full mt-3 mr-4 flex-shrink-0" />
        <p className="text-lg leading-relaxed">{line.trim()}</p>
      </div>
    ));
  } else {
    return <p className="text-gray-600 italic">{fallbackText}</p>;
  }
};

const AIInsights: React.FC<AIInsightsProps> = ({ caseData, onClose }) => {
  const [insights, setInsights] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isConnected, connectionStatus } = useAISettingsStore();
  const navigate = useNavigate();

  const generateInsights = async () => {
    if (!isConnected) {
      setError('AI features are not available. Please configure your OpenAI API key in Settings.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await aiService.analyzeCase(caseData);
      setInsights(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate insights');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="text-center py-8">
          <Brain className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">AI Insights Not Available</h3>
          <p className="text-gray-500 mb-4">
            To use AI-powered case analysis, you need to configure your OpenAI API key.
          </p>
          <button
            onClick={() => navigate('/settings')}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            <Settings className="h-4 w-4 mr-2" />
            Configure AI Settings
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center">
          <Brain className="h-7 w-7 text-primary-600 mr-3" />
          <h3 className="text-xl font-bold text-gray-900">AI-Powered Case Insights</h3>
          
          {/* Connection Status */}
          <div className="ml-4 flex items-center">
            {connectionStatus === 'connected' ? (
              <div className="flex items-center text-green-600 text-sm font-medium bg-green-50 px-3 py-1.5 rounded-full">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2" />
                AI Connected
              </div>
            ) : connectionStatus === 'error' ? (
              <div className="flex items-center text-red-600 text-sm font-medium bg-red-50 px-3 py-1.5 rounded-full">
                <div className="w-2 h-2 bg-red-500 rounded-full mr-2" />
                AI Error
              </div>
            ) : (
              <div className="flex items-center text-gray-500 text-sm font-medium bg-gray-50 px-3 py-1.5 rounded-full">
                <div className="w-2 h-2 bg-gray-400 rounded-full mr-2" />
                AI Checking
              </div>
            )}
          </div>
        </div>
        
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <span className="sr-only">Close</span>
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Generate Button */}
      {!insights && !isLoading && (
        <div className="text-center py-12">
          <Zap className="mx-auto h-16 w-16 text-primary-400 mb-6" />
          <h4 className="text-2xl font-bold text-gray-900 mb-3">Generate AI Insights</h4>
          <p className="text-gray-600 mb-8 text-lg max-w-2xl mx-auto">
            Get AI-powered analysis of this case including risk assessment, recommendations, and next steps.
          </p>
          <button
            onClick={generateInsights}
            className="inline-flex items-center px-8 py-4 text-lg font-semibold text-white bg-gradient-to-r from-primary-600 to-primary-700 rounded-xl hover:from-primary-700 hover:to-primary-800 focus:outline-none focus:ring-4 focus:ring-primary-500 focus:ring-opacity-50 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            <Brain className="h-6 w-6 mr-3" />
            Generate Insights
          </button>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-16">
          <div className="inline-flex items-center px-6 py-4 bg-blue-50 rounded-xl">
            <RefreshCw className="h-8 w-8 text-blue-600 animate-spin mr-3" />
            <div>
              <h4 className="text-lg font-semibold text-blue-900">Analyzing Case...</h4>
              <p className="text-blue-700 text-sm">AI is processing case information and generating insights</p>
            </div>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-6">
          <div className="flex items-start">
            <AlertTriangle className="h-6 w-6 text-red-500 mr-3 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-lg font-semibold text-red-800 mb-2">Error Generating Insights</h4>
              <p className="text-red-700">{error}</p>
              <button
                onClick={generateInsights}
                className="mt-4 inline-flex items-center px-4 py-2 text-sm font-medium text-red-700 bg-red-100 rounded-lg hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <RefreshCw className="h-5 w-5 mr-2" />
                Try Again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Insights Display */}
      {insights && (
        <div className="space-y-8">
          {/* Key Insights Section */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-8 border border-blue-200">
            <div className="flex items-center mb-6">
              <Target className="h-8 w-8 text-blue-600 mr-3" />
              <h4 className="text-2xl font-bold text-blue-900">Key Insights About This Case</h4>
            </div>
            <div className="space-y-4">
              {renderContent(insights.keyInsights || insights.insights, 'Key insights about this case will be displayed here.')}
            </div>
          </div>

          {/* Recommendations Section */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-8 border border-green-200">
            <div className="flex items-center mb-6">
              <Lightbulb className="h-8 w-8 text-green-600 mr-3" />
              <h4 className="text-2xl font-bold text-green-900">Specific Recommendations for RTW Management</h4>
            </div>
            <div className="space-y-4 text-green-800">
              {renderContent(insights.recommendations, 'Specific recommendations will be displayed here.')}
            </div>
          </div>

          {/* Risk Assessment Section */}
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-8 border border-amber-200">
            <div className="flex items-center mb-6">
              <Shield className="h-8 w-8 text-amber-600 mr-3" />
              <h4 className="text-2xl font-bold text-amber-900">Risk Assessment and Potential Barriers</h4>
            </div>
            <div className="space-y-4 text-amber-800">
              {renderContent(insights.riskAssessment, 'Risk assessment will be displayed here.')}
            </div>
          </div>

          {/* Next Steps Section */}
          <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-2xl p-8 border border-purple-200">
            <div className="flex items-center mb-6">
              <TrendingUp className="h-8 w-8 text-purple-600 mr-3" />
              <h4 className="text-2xl font-bold text-purple-900">Next Steps and Action Items</h4>
            </div>
            <div className="space-y-4 text-purple-800">
              {renderContent(insights.nextSteps, 'Next steps will be displayed here.')}
            </div>
          </div>

          {/* Compliance Section */}
          <div className="bg-gradient-to-br from-slate-50 to-gray-50 rounded-2xl p-8 border border-slate-200">
            <div className="flex items-center mb-6">
              <FileText className="h-8 w-8 text-slate-600 mr-3" />
              <h4 className="text-2xl font-bold text-slate-900">Compliance Considerations for WorkCover Requirements</h4>
            </div>
            <div className="space-y-4 text-slate-800">
              {renderContent(insights.complianceConsiderations, 'Compliance considerations will be displayed here.')}
            </div>
          </div>

          {/* Regenerate Button */}
          <div className="text-center pt-6">
            <button
              onClick={generateInsights}
              className="inline-flex items-center px-6 py-3 text-base font-medium text-primary-700 bg-primary-50 border border-primary-200 rounded-xl hover:bg-primary-100 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors"
            >
              <RefreshCw className="h-5 w-5 mr-2" />
              Regenerate Insights
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIInsights;