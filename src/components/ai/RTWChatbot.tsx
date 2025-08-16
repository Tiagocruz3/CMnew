import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, User, AlertTriangle, Info, CheckCircle, Clock, ExternalLink, FileText, Users, Calendar, BarChart3, Settings, Calculator } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCaseStore } from '../../store/caseStore';
import { useAuthStore } from '../../store/authStore';
import { useAISettingsStore } from '../../store/aiSettingsStore';
import { Case, CaseStatus, Communication, Document, CaseNote } from '../../types';
import { aiService } from '../../services/aiService';

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata?: {
    caseId?: string;
    caseName?: string;
    source?: string;
    actions?: ActionItem[];
  };
}

interface ActionItem {
  label: string;
  action: 'navigate' | 'open_case' | 'open_page' | 'populate_rtw_planner';
  target: string;
  icon: React.ReactNode;
  description: string;
  data?: any; // Additional data for RTW Planner population
}

interface RTWChatbotProps {
  isOpen: boolean;
  onToggle: () => void;
}

const RTWChatbot: React.FC<RTWChatbotProps> = ({ isOpen, onToggle }) => {
  const { cases, getCase } = useCaseStore();
  const { user } = useAuthStore();
  const { isConnected, connectionStatus } = useAISettingsStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'assistant',
      content: `Hello! I'm your RTW Management AI Assistant. I can help you with:\n\n• Case information and status updates\n• RTW plan guidance and best practices\n• Compensation and PIAWE calculations\n• Document management and compliance\n• Stakeholder communication strategies\n• Review date scheduling and management\n• Medical certificate analysis\n• Risk assessment and recommendations\n\nI can also navigate you to specific cases, pages, and sections within the app. Just ask me to "open case [number]" or "take me to [page name]".\n\nHow can I assist you today?`,
      timestamp: new Date(),
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Get current case context from URL
  const getCurrentCaseContext = (): Case | null => {
    const caseMatch = location.pathname.match(/\/cases\/([^\/]+)/);
    if (caseMatch) {
      const caseId = caseMatch[1];
      return cases.find(c => c.id === caseId) || null;
    }
    return null;
  };

  // Get current page context
  const getCurrentPageContext = (): string => {
    const path = location.pathname;
    if (path.startsWith('/cases/')) return 'case_detail';
    if (path === '/cases') return 'case_list';
    if (path === '/dashboard') return 'dashboard';
    if (path === '/calendar') return 'calendar';
    if (path === '/reports') return 'reports';
    if (path === '/settings') return 'settings';
    if (path === '/profile') return 'profile';
    if (path === '/users') return 'users';
    if (path === '/admin') return 'admin';
    if (path === '/quality-control') return 'quality_control';
    if (path === '/piawe-calculator') return 'piawe_calculator';
    return 'unknown';
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Update welcome message based on current context
  useEffect(() => {
    const currentCase = getCurrentCaseContext();
    const currentPage = getCurrentPageContext();
    
    if (currentCase && messages.length === 1) {
      // Update welcome message when viewing a specific case
      setMessages(prev => prev.map(msg => 
        msg.id === '1' ? {
          ...msg,
          content: `Hello! I'm your RTW Management AI Assistant. I can see you're currently viewing case ${currentCase.claimNumber} for ${currentCase.worker.firstName} ${currentCase.worker.lastName}.\n\nI can help you with:\n\n• Information about this specific case\n• RTW plan guidance and best practices\n• Compensation and PIAWE calculations\n• Document management and compliance\n• Stakeholder communication strategies\n• Review date scheduling and management\n• Medical certificate analysis\n• Risk assessment and recommendations\n\nAsk me anything about this case or request navigation to other parts of the app. How can I assist you?`
        } : msg
      ));
    } else if (currentPage === 'case_list' && messages.length === 1) {
      // Update welcome message when viewing case list
      setMessages(prev => prev.map(msg => 
        msg.id === '1' ? {
          ...msg,
          content: `Hello! I'm your RTW Management AI Assistant. I can see you're currently viewing the case list.\n\nI can help you with:\n\n• Case information and status updates\n• RTW plan guidance and best practices\n• Compensation and PIAWE calculations\n• Document management and compliance\n• Stakeholder communication strategies\n• Review date scheduling and management\n• Medical certificate analysis\n• Risk assessment and recommendations\n\nI can also navigate you to specific cases, pages, and sections within the app. Just ask me to "open case [number]" or "take me to [page name]".\n\nHow can I assist you today?`
        } : msg
      ));
    }
  }, [location.pathname, cases, messages.length]);

  const getCaseContext = (caseId: string): string => {
    const caseData = cases.find(c => c.id === caseId);
    if (!caseData) return 'Case not found.';
    
    return `
Case: ${caseData.worker.firstName} ${caseData.worker.lastName}
Claim Number: ${caseData.claimNumber}
Status: ${caseData.status}
Employer: ${caseData.employer.name}
Injury Date: ${caseData.injuryDate}
Planned RTW Date: ${caseData.plannedRtwDate}
WorkCover Type: ${caseData.workcoverType || 'Not specified'}
Documents: ${caseData.documents.length} uploaded
Communications: ${caseData.communications.length} logged
Notes: ${caseData.notes.length} recorded
    `.trim();
  };

  const getCasesSummary = (): string => {
    const totalCases = cases.length;
    const openCases = cases.filter(c => c.status === 'open').length;
    const pendingCases = cases.filter(c => c.status === 'pending').length;
    const closedCases = cases.filter(c => c.status === 'closed').length;
    
    return `
Total Cases: ${totalCases}
Open Cases: ${openCases}
Pending Cases: ${pendingCases}
Closed Cases: ${closedCases}
    `.trim();
  };

  const getUrgentAlerts = (): string[] => {
    const alerts: string[] = [];
    const today = new Date();
    
    cases.forEach(caseData => {
      // Check for upcoming review dates
      caseData.reviewDates?.forEach(date => {
        const reviewDate = new Date(date);
        const daysUntil = Math.ceil((reviewDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysUntil <= 7 && daysUntil >= 0) {
          alerts.push(`⚠️ Review due in ${daysUntil} days for ${caseData.worker.firstName} ${caseData.worker.lastName} (${caseData.claimNumber})`);
        }
      });

      // Check for overdue RTW dates
      const plannedRTW = new Date(caseData.plannedRtwDate);
      if (plannedRTW < today && caseData.status === 'open') {
        alerts.push(`🚨 RTW date overdue for ${caseData.worker.firstName} ${caseData.worker.lastName} (${caseData.claimNumber})`);
      }

      // Check for cases without recent activity
      const lastActivity = caseData.updatedAt;
      const daysSinceActivity = Math.ceil((today.getTime() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24));
      if (daysSinceActivity > 14 && caseData.status === 'open') {
        alerts.push(`📝 No recent activity for ${caseData.worker.firstName} ${caseData.worker.lastName} (${caseData.claimNumber}) - ${daysSinceActivity} days`);
      }
    });

    return alerts;
  };

  const handleActionClick = (action: ActionItem) => {
    switch (action.action) {
      case 'navigate':
        navigate(action.target);
        break;
      case 'open_case':
        navigate(`/cases/${action.target}`);
        break;
      case 'open_page':
        navigate(action.target);
        break;
      case 'populate_rtw_planner':
        const caseData = cases.find(c => c.id === action.target);
        if (caseData) {
          // Actually populate the RTW Planner fields
          const rtwPlannerRef = (window as any).rtwPlannerRef;
          const currentCaseId = (window as any).currentCaseId;
          
          console.log('Attempting to populate RTW Planner:', {
            caseId: action.target,
            currentCaseId,
            rtwPlannerRef: !!rtwPlannerRef,
            hasData: !!action.data
          });
          
          if (rtwPlannerRef && currentCaseId === action.target && action.data) {
            // Call the RTW Planner's populate method
            console.log('Calling populateFromAI with data:', action.data);
            rtwPlannerRef.populateFromAI(action.data);
            
            setMessages(prev => [...prev, {
              id: (Date.now() + 1).toString(),
              type: 'assistant',
              content: `✅ Successfully populated the RTW Planner fields for case ${caseData.claimNumber} (${caseData.worker.firstName} ${caseData.worker.lastName}) with AI recommendations!\n\nYou can now review and update the plan in the RTW Planner tab.`,
              timestamp: new Date(),
              metadata: {
                caseId: caseData.id,
                caseName: `${caseData.worker.firstName} ${caseData.worker.lastName}`,
                actions: [
                  {
                    label: `View RTW Planner`,
                    action: 'open_case',
                    target: caseData.id,
                    icon: <FileText className="h-4 w-4" />,
                    description: `Go to RTW Planner tab to review populated fields`
                  }
                ]
              }
            }]);
          } else {
            // Fallback if RTW Planner ref is not available
            console.log('RTW Planner ref not available, showing fallback message');
            setMessages(prev => [...prev, {
              id: (Date.now() + 1).toString(),
              type: 'assistant',
              content: `I've generated RTW plan recommendations for case ${caseData.claimNumber} (${caseData.worker.firstName} ${caseData.worker.lastName}).\n\nTo populate the RTW Planner:\n1. Go to the RTW Planner tab\n2. Click "AI Assist" to apply these recommendations`,
              timestamp: new Date(),
              metadata: {
                caseId: caseData.id,
                caseName: `${caseData.worker.firstName} ${caseData.worker.lastName}`,
                actions: [
                  {
                    label: `View Case ${caseData.claimNumber}`,
                    action: 'open_case',
                    target: caseData.id,
                    icon: <FileText className="h-4 w-4" />,
                    description: `View full details for ${caseData.worker.firstName} ${caseData.worker.lastName}`
                  }
                ]
              }
            }]);
          }
        }
        break;
    }
    // Close chatbot after navigation
    onToggle();
  };

  const processUserMessage = async (userMessage: string) => {
    const userMsg: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: userMessage,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);
    setIsTyping(true);

    try {
      let response = '';
      let metadata = {};
      let actions: ActionItem[] = [];

      // Get current context
      const currentCase = getCurrentCaseContext();
      const currentPage = getCurrentPageContext();

      // Check for navigation requests
      const navigationPatterns = [
        {
          pattern: /(?:open|show|go to|navigate to|take me to)\s+(?:the\s+)?(?:page\s+)?(dashboard|cases|calendar|reports|settings|profile|users|admin|quality|piawe)/i,
          action: 'open_page',
          getTarget: (match: RegExpMatchArray) => {
            const page = match[1].toLowerCase();
            const pageRoutes: Record<string, string> = {
              dashboard: '/dashboard',
              cases: '/cases',
              calendar: '/calendar',
              reports: '/reports',
              settings: '/settings',
              profile: '/profile',
              users: '/users',
              admin: '/admin',
              quality: '/quality-control',
              piawe: '/piawe-calculator'
            };
            return pageRoutes[page] || '/dashboard';
          },
          getIcon: (match: RegExpMatchArray) => {
            const page = match[1].toLowerCase();
            const icons: Record<string, React.ReactNode> = {
              dashboard: <BarChart3 className="h-4 w-4" />,
              cases: <FileText className="h-4 w-4" />,
              calendar: <Calendar className="h-4 w-4" />,
              reports: <BarChart3 className="h-4 w-4" />,
              settings: <Settings className="h-4 w-4" />,
              profile: <User className="h-4 w-4" />,
              users: <Users className="h-4 w-4" />,
              admin: <Settings className="h-4 w-4" />,
              quality: <CheckCircle className="h-4 w-4" />,
              piawe: <Calculator className="h-4 w-4" />
            };
            return icons[page] || <ExternalLink className="h-4 w-4" />;
          }
        },
        {
          pattern: /(?:open|show|go to|navigate to|take me to)\s+(?:case\s+)?(?:number\s+)?([A-Z0-9-]+)/i,
          action: 'open_case',
          getTarget: (match: RegExpMatchArray) => match[1],
          getIcon: () => <FileText className="h-4 w-4" />
        }
      ];

      // Check for navigation patterns
      for (const pattern of navigationPatterns) {
        const match = userMessage.match(pattern.pattern);
        if (match) {
          const target = pattern.getTarget(match);
          const icon = pattern.getIcon(match);
          
          if (pattern.action === 'open_case') {
            const caseData = cases.find(c => c.claimNumber.toLowerCase().includes(match[1].toLowerCase()));
            if (caseData) {
              actions.push({
                label: `Open Case ${caseData.claimNumber}`,
                action: 'open_case',
                target: caseData.id,
                icon,
                description: `${caseData.worker.firstName} ${caseData.worker.lastName} - ${caseData.employer.name}`
              });
              response += `I found case ${caseData.claimNumber} for ${caseData.worker.firstName} ${caseData.worker.lastName}. Here's the case information:\n\n${getCaseContext(caseData.id)}\n\n`;
              metadata = { caseId: caseData.id, caseName: `${caseData.worker.firstName} ${caseData.worker.lastName}` };
            } else {
              response += `I couldn't find a case with claim number ${match[1]}. Please check the claim number and try again.\n\n`;
            }
          } else {
            const pageName = match[1].charAt(0).toUpperCase() + match[1].slice(1);
            actions.push({
              label: `Go to ${pageName}`,
              action: 'open_page',
              target,
              icon,
              description: `Navigate to the ${pageName.toLowerCase()} page`
            });
            response += `I can take you to the ${pageName} page. Click the button below to navigate there.\n\n`;
          }
          break;
        }
      }

      // Check for specific case queries (without navigation)
      if (!actions.length) {
        const caseMatch = userMessage.match(/case\s+(?:number\s+)?([A-Z0-9-]+)/i);
        if (caseMatch) {
          const claimNumber = caseMatch[1];
          const caseData = cases.find(c => c.claimNumber.toLowerCase().includes(claimNumber.toLowerCase()));
          if (caseData) {
            metadata = { caseId: caseData.id, caseName: `${caseData.worker.firstName} ${caseData.worker.lastName}` };
            response += `Here's information about case ${caseData.claimNumber}:\n\n${getCaseContext(caseData.id)}\n\n`;
            
            // Add action to open the case
            actions.push({
              label: `Open Case ${caseData.claimNumber}`,
              action: 'open_case',
              target: caseData.id,
              icon: <FileText className="h-4 w-4" />,
              description: `View full details for ${caseData.worker.firstName} ${caseData.worker.lastName}`
            });
          }
        }
      }

      // Check for status queries
      if (userMessage.toLowerCase().includes('status') || userMessage.toLowerCase().includes('summary')) {
        if (currentCase) {
          // If viewing a specific case, provide case-specific status
          response += `Here's the current status for case ${currentCase.claimNumber}:\n\n${getCaseContext(currentCase.id)}\n\n`;
          
          // Add action to view all cases
          actions.push({
            label: 'View All Cases',
            action: 'open_page',
            target: '/cases',
            icon: <FileText className="h-4 w-4" />,
            description: 'See overview of all cases'
          });
        } else {
          // If not viewing a specific case, provide general summary
          response += `Here's your current case summary:\n\n${getCasesSummary()}\n\n`;
          
          // Add action to go to cases page
          actions.push({
            label: 'View All Cases',
            action: 'open_page',
            target: '/cases',
            icon: <FileText className="h-4 w-4" />,
            description: 'See detailed case list and management options'
          });
        }
      }

      // Check for urgent alerts
      if (userMessage.toLowerCase().includes('alert') || userMessage.toLowerCase().includes('urgent') || userMessage.toLowerCase().includes('due')) {
        const alerts = getUrgentAlerts();
        if (alerts.length > 0) {
          response += `Here are your urgent alerts:\n\n${alerts.join('\n')}\n\n`;
          
          // Add action to go to cases page to address alerts
          actions.push({
            label: 'Address Alerts',
            action: 'open_page',
            target: '/cases',
            icon: <AlertTriangle className="h-4 w-4" />,
            description: 'Go to cases to review and address urgent items'
          });
        } else {
          response += `No urgent alerts at this time. All cases are up to date.\n\n`;
        }
      }

      // Check for RTW Planner population requests
      if (userMessage.toLowerCase().includes('populate') && (userMessage.toLowerCase().includes('rtw') || userMessage.toLowerCase().includes('planner') || userMessage.toLowerCase().includes('plan'))) {
        if (currentCase) {
          // Generate RTW plan recommendations using AI
          try {
            const rtwPrompt = `Based on the following case information, please provide specific recommendations for a Return to Work plan:

Case Details:
- Worker: ${currentCase.worker.firstName} ${currentCase.worker.lastName}
- Injury: ${currentCase.injuryDescription || 'Not specified'}
- Status: ${currentCase.status}
- Job Title: ${(currentCase.worker as any).position || 'Not specified'}
- Employer: ${currentCase.employer.name}

Please provide structured recommendations for:
1. Duties and tasks that can be safely undertaken
2. Workplace supports, aids, or modifications needed
3. Duties or tasks to be avoided
4. Medical restrictions to consider
5. Recommended hours progression over 4 weeks (specific hours for each day)

Format as clear, actionable recommendations that can be directly used in an RTW plan.`;

            const rtwRecommendations = await aiService.chatWithRTWExpert(rtwPrompt, currentCase);
            
            // Parse the AI response to extract structured data
            const recommendations = parseRTWRecommendations(rtwRecommendations);
            
            response += `I've analyzed case ${currentCase.claimNumber} and generated RTW plan recommendations:\n\n${rtwRecommendations}\n\n`;
            
            // Add action to populate the RTW Planner
            actions.push({
              label: `Populate RTW Planner for ${currentCase.claimNumber}`,
              action: 'populate_rtw_planner',
              target: currentCase.id,
              icon: <FileText className="h-4 w-4" />,
              description: `Auto-fill RTW Planner fields with AI recommendations`,
              data: recommendations
            });
            
            metadata = { caseId: currentCase.id, caseName: `${currentCase.worker.firstName} ${currentCase.worker.lastName}` };
          } catch (error) {
            response += `I encountered an error generating RTW plan recommendations. Please try again or contact support.\n\n`;
          }
        } else {
          response += `I need to know which case you'd like me to populate the RTW Planner for. Please either:\n\n1. Navigate to a specific case first, or\n2. Ask me to "populate RTW planner for case [claim number]"\n\n`;
          
          // Add action to go to cases page
          actions.push({
            label: 'View All Cases',
            action: 'open_page',
            target: '/cases',
            icon: <FileText className="h-4 w-4" />,
            description: 'Select a case to populate RTW Planner'
          });
        }
      }

      // Check for case-specific questions when viewing a case
      if (currentCase && !actions.length) {
        const caseSpecificPatterns = [
          { pattern: /(?:what|how|when|where|why|tell me about|show me|give me|get).*(?:this case|current case|case|worker|injury|rtw|return to work|employer|claim|documents|communications|notes|stakeholders|compensation|piawe|review|dates)/i, context: 'case_general' },
          { pattern: /(?:worker|employee|injured|person|staff)/i, context: 'worker_info' },
          { pattern: /(?:employer|company|business|organization)/i, context: 'employer_info' },
          { pattern: /(?:injury|accident|incident|damage|harm)/i, context: 'injury_info' },
          { pattern: /(?:rtw|return to work|return-to-work|rehabilitation|recovery)/i, context: 'rtw_info' },
          { pattern: /(?:documents|files|uploads|attachments|papers)/i, context: 'documents_info' },
          { pattern: /(?:communications|messages|emails|calls|meetings)/i, context: 'communications_info' },
          { pattern: /(?:notes|comments|observations|remarks)/i, context: 'notes_info' },
          { pattern: /(?:stakeholders|doctors|lawyers|specialists|consultants)/i, context: 'stakeholders_info' },
          { pattern: /(?:compensation|piawe|payments|wages|salary|benefits)/i, context: 'compensation_info' },
          { pattern: /(?:review|dates|scheduled|appointments|meetings)/i, context: 'review_info' }
        ];

        for (const pattern of caseSpecificPatterns) {
          if (userMessage.match(pattern.pattern)) {
            // Provide case-specific information based on context
            switch (pattern.context) {
              case 'worker_info':
                response += `Here's information about the worker in case ${currentCase.claimNumber}:\n\n`;
                response += `Name: ${currentCase.worker.firstName} ${currentCase.worker.lastName}\n`;
                response += `Position: ${currentCase.worker.position}\n`;
                response += `Email: ${currentCase.worker.email}\n`;
                response += `Phone: ${currentCase.worker.phone}\n\n`;
                break;
              case 'employer_info':
                response += `Here's information about the employer in case ${currentCase.claimNumber}:\n\n`;
                response += `Company: ${currentCase.employer.name}\n`;
                response += `Email: ${currentCase.employer.email || 'Not provided'}\n`;
                response += `Phone: ${currentCase.employer.phone || 'Not provided'}\n`;
                response += `Address: ${currentCase.employer.address || 'Not provided'}\n\n`;
                break;
              case 'injury_info':
                response += `Here's information about the injury in case ${currentCase.claimNumber}:\n\n`;
                response += `Injury Date: ${currentCase.injuryDate}\n`;
                response += `Description: ${currentCase.injuryDescription}\n`;
                response += `First Certificate Date: ${currentCase.firstCertificateDate}\n\n`;
                break;
              case 'rtw_info':
                response += `Here's information about the RTW plan in case ${currentCase.claimNumber}:\n\n`;
                response += `Planned RTW Date: ${currentCase.plannedRtwDate}\n`;
                response += `Status: ${currentCase.status}\n`;
                response += `Review Dates: ${currentCase.reviewDates?.length || 0} scheduled\n`;
                response += `Documents: ${currentCase.documents.length} uploaded\n\n`;
                break;
              case 'documents_info':
                response += `Here's information about documents in case ${currentCase.claimNumber}:\n\n`;
                response += `Total Documents: ${currentCase.documents.length}\n`;
                if (currentCase.documents.length > 0) {
                  const categories = currentCase.documents.reduce((acc, doc) => {
                    const category = doc.category || 'uncategorized';
                    acc[category] = (acc[category] || 0) + 1;
                    return acc;
                  }, {} as Record<string, number>);
                  Object.entries(categories).forEach(([category, count]) => {
                    response += `${category}: ${count}\n`;
                  });
                }
                response += `\n`;
                break;
              case 'communications_info':
                response += `Here's information about communications in case ${currentCase.claimNumber}:\n\n`;
                response += `Total Communications: ${currentCase.communications.length}\n`;
                if (currentCase.communications.length > 0) {
                  const types = currentCase.communications.reduce((acc, comm) => {
                    acc[comm.type] = (acc[comm.type] || 0) + 1;
                    return acc;
                  }, {} as Record<string, number>);
                  Object.entries(types).forEach(([type, count]) => {
                    response += `${type}: ${count}\n`;
                  });
                }
                response += `\n`;
                break;
              case 'notes_info':
                response += `Here's information about notes in case ${currentCase.claimNumber}:\n\n`;
                response += `Total Notes: ${currentCase.notes.length}\n`;
                if (currentCase.notes.length > 0) {
                  response += `Latest Note: ${currentCase.notes[currentCase.notes.length - 1]?.content?.substring(0, 100)}...\n`;
                }
                response += `\n`;
                break;
              case 'stakeholders_info':
                response += `Here's information about stakeholders in case ${currentCase.claimNumber}:\n\n`;
                response += `Total Stakeholders: ${currentCase.stakeholders?.length || 0}\n`;
                if (currentCase.stakeholders && currentCase.stakeholders.length > 0) {
                  currentCase.stakeholders.forEach(stakeholder => {
                    response += `• ${stakeholder.name} (${stakeholder.type}) - ${stakeholder.organization || 'No organization'}\n`;
                  });
                }
                response += `\n`;
                break;
              case 'compensation_info':
                response += `Here's information about compensation in case ${currentCase.claimNumber}:\n\n`;
                if (currentCase.compensation) {
                  response += `PIAWE Calculation: Available\n`;
                  response += `Medical Excess: ${currentCase.medicalExcess ? `Threshold: $${currentCase.medicalExcess.threshold}, Current: $${currentCase.medicalExcess.current}` : 'Not set'}\n`;
                } else {
                  response += `Compensation information not yet available\n`;
                }
                response += `\n`;
                break;
              case 'review_info':
                response += `Here's information about reviews in case ${currentCase.claimNumber}:\n\n`;
                response += `Total Review Dates: ${currentCase.reviewDates?.length || 0}\n`;
                if (currentCase.reviewDates && currentCase.reviewDates.length > 0) {
                  const today = new Date();
                  currentCase.reviewDates.forEach(date => {
                    const reviewDate = new Date(date);
                    const daysUntil = Math.ceil((reviewDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                    response += `• ${date}: ${daysUntil > 0 ? `${daysUntil} days away` : daysUntil === 0 ? 'Today' : `${Math.abs(daysUntil)} days ago`}\n`;
                  });
                }
                response += `\n`;
                break;
              default:
                response += `Here's information about case ${currentCase.claimNumber}:\n\n${getCaseContext(currentCase.id)}\n\n`;
            }
            break;
          }
        }
      }

      // Generate AI response using the aiService with current case context
      const aiResponse = await aiService.chatWithRTWExpert(userMessage, currentCase || (cases.length > 0 ? cases[0] : undefined));

      response += aiResponse;

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: response,
        timestamp: new Date(),
        metadata: { ...metadata, actions },
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (error) {
      console.error('Error processing message:', error);
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: 'I apologize, but I encountered an error processing your request. Please try again or contact support if the issue persists.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
      setIsTyping(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() && !isLoading) {
      processUserMessage(inputValue.trim());
    }
  };

  const getStatusIcon = (status: CaseStatus) => {
    switch (status) {
      case 'open':
        return <Clock className="h-4 w-4 text-green-600" />;
      case 'pending':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'closed':
        return <CheckCircle className="h-4 w-4 text-gray-600" />;
      default:
        return <Info className="h-4 w-4 text-blue-600" />;
    }
  };

  // Parse RTW recommendations from AI response
  const parseRTWRecommendations = (aiResponse: string) => {
    const recommendations = {
      dutiesTasks: '',
      workplaceSupports: '',
      dutiesToAvoid: '',
      medicalRestrictions: '',
      week1Hours: { mon: '', tue: '', wed: '', thu: '', fri: '', sat: '', sun: '', total: '' },
      week2Hours: { mon: '', tue: '', wed: '', thu: '', fri: '', sat: '', sun: '', total: '' },
      week3Hours: { mon: '', tue: '', wed: '', thu: '', fri: '', sat: '', sun: '', total: '' },
      week4Hours: { mon: '', tue: '', wed: '', thu: '', fri: '', sat: '', sun: '', total: '' }
    };

    const lines = aiResponse.split('\n').filter(line => line.trim());
    let currentSection = '';
    let dutiesTasks = '';
    let workplaceSupports = '';
    let dutiesToAvoid = '';
    let medicalRestrictions = '';
    let hoursRecommendation = '';
    
    lines.forEach(line => {
      const trimmedLine = line.trim();
      
      // Detect section headers
      if (trimmedLine.toLowerCase().includes('duties') && trimmedLine.toLowerCase().includes('tasks')) {
        currentSection = 'duties';
      } else if (trimmedLine.toLowerCase().includes('workplace') || trimmedLine.toLowerCase().includes('supports')) {
        currentSection = 'supports';
      } else if (trimmedLine.toLowerCase().includes('avoid') || trimmedLine.toLowerCase().includes('restricted')) {
        currentSection = 'avoid';
      } else if (trimmedLine.toLowerCase().includes('medical') || trimmedLine.toLowerCase().includes('restrictions')) {
        currentSection = 'medical';
      } else if (trimmedLine.toLowerCase().includes('hours') || trimmedLine.toLowerCase().includes('progression')) {
        currentSection = 'hours';
      } else if (trimmedLine && !trimmedLine.startsWith('-') && !trimmedLine.startsWith('•')) {
        // This is content
        switch (currentSection) {
          case 'duties':
            dutiesTasks += (dutiesTasks ? '\n' : '') + trimmedLine;
            break;
          case 'supports':
            workplaceSupports += (workplaceSupports ? '\n' : '') + trimmedLine;
            break;
          case 'avoid':
            dutiesToAvoid += (dutiesToAvoid ? '\n' : '') + trimmedLine;
            break;
          case 'medical':
            medicalRestrictions += (medicalRestrictions ? '\n' : '') + trimmedLine;
            break;
          case 'hours':
            hoursRecommendation += (hoursRecommendation ? '\n' : '') + trimmedLine;
            break;
        }
      }
    });

    // Parse hours progression if provided
    if (hoursRecommendation) {
      const hoursMatch = hoursRecommendation.match(/(\d+(?:\.\d+)?)\s*hours?/i);
      if (hoursMatch) {
        const baseHours = parseFloat(hoursMatch[1]);
        
        // Distribute hours across weeks with progression
        const week1Hours = baseHours * 0.5; // Start with 50% of base hours
        const week2Hours = baseHours * 0.75; // 75% of base hours
        const week3Hours = baseHours * 0.9; // 90% of base hours
        const week4Hours = baseHours; // 100% of base hours
        
        // Distribute across weekdays (Monday-Friday)
        ['mon', 'tue', 'wed', 'thu', 'fri'].forEach(day => {
          recommendations.week1Hours[day as keyof typeof recommendations.week1Hours] = week1Hours.toString();
          recommendations.week2Hours[day as keyof typeof recommendations.week2Hours] = week2Hours.toString();
          recommendations.week3Hours[day as keyof typeof recommendations.week3Hours] = week3Hours.toString();
          recommendations.week4Hours[day as keyof typeof recommendations.week4Hours] = week4Hours.toString();
        });
        
        // Set weekend hours to 0
        ['sat', 'sun'].forEach(day => {
          recommendations.week1Hours[day as keyof typeof recommendations.week1Hours] = '0';
          recommendations.week2Hours[day as keyof typeof recommendations.week2Hours] = '0';
          recommendations.week3Hours[day as keyof typeof recommendations.week3Hours] = '0';
          recommendations.week4Hours[day as keyof typeof recommendations.week4Hours] = '0';
        });
        
        // Calculate totals
        recommendations.week1Hours.total = (week1Hours * 5).toString();
        recommendations.week2Hours.total = (week2Hours * 5).toString();
        recommendations.week3Hours.total = (week3Hours * 5).toString();
        recommendations.week4Hours.total = (week4Hours * 5).toString();
      }
    }

    // Update recommendations with parsed content
    recommendations.dutiesTasks = dutiesTasks || 'Duties and tasks to be determined based on worker capacity and medical recommendations.';
    recommendations.workplaceSupports = workplaceSupports || 'Workplace supports and modifications to be determined based on worker needs and workplace assessment.';
    recommendations.dutiesToAvoid = dutiesToAvoid || 'Duties to be avoided will be determined based on medical restrictions and worker capacity assessment.';
    recommendations.medicalRestrictions = medicalRestrictions || 'Medical restrictions to be determined based on current medical certificates and treating practitioner recommendations.';

    return recommendations;
  };

  if (!isOpen) {
    const urgentAlerts = getUrgentAlerts();
    const hasUrgentAlerts = urgentAlerts.length > 0;
    
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={onToggle}
          className="bg-primary-600 hover:bg-primary-700 text-white rounded-full p-4 shadow-lg transition-all duration-200 hover:scale-110 relative"
          title="RTW AI Assistant"
        >
          <MessageCircle className="h-6 w-6" />
          
          {/* Connection Status Indicator */}
          <div className="absolute -top-1 -left-1">
            {connectionStatus === 'connected' ? (
              <div className="w-3 h-3 bg-green-500 rounded-full border-2 border-white" title="AI Connected" />
            ) : connectionStatus === 'error' ? (
              <div className="w-3 h-3 bg-red-500 rounded-full border-2 border-white" title="AI Connection Error" />
            ) : connectionStatus === 'checking' ? (
              <div className="w-3 h-3 bg-blue-500 rounded-full border-2 border-white animate-pulse" title="Checking AI Connection" />
            ) : (
              <div className="w-3 h-3 bg-gray-400 rounded-full border-2 border-white" title="AI Not Connected" />
            )}
          </div>
          
          {/* Urgent Alerts Badge */}
          {hasUrgentAlerts && (
            <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-6 w-6 flex items-center justify-center animate-pulse">
              {urgentAlerts.length > 9 ? '9+' : urgentAlerts.length}
            </div>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <div className="bg-white rounded-lg shadow-2xl border border-gray-200 w-96 h-[600px] flex flex-col">
        {/* Header */}
        <div className="bg-primary-600 text-white p-4 rounded-t-lg flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Bot className="h-5 w-5" />
            <h3 className="font-semibold">RTW AI Assistant</h3>
            
            {/* Connection Status in Header */}
            <div className="ml-2 flex items-center">
              {connectionStatus === 'connected' ? (
                <div className="flex items-center text-green-200 text-xs">
                  <div className="w-2 h-2 bg-green-400 rounded-full mr-1" />
                  Connected
                </div>
              ) : connectionStatus === 'error' ? (
                <div className="flex items-center text-red-200 text-xs">
                  <div className="w-2 h-2 bg-red-400 rounded-full mr-1" />
                  Error
                </div>
              ) : connectionStatus === 'checking' ? (
                <div className="flex items-center text-blue-200 text-xs">
                  <div className="w-2 h-2 bg-blue-400 rounded-full mr-1 animate-pulse" />
                  Checking
                </div>
              ) : (
                <div className="flex items-center text-gray-300 text-xs">
                  <div className="w-2 h-2 bg-gray-400 rounded-full mr-1" />
                  Disconnected
                </div>
              )}
            </div>
          </div>
          <button
            onClick={onToggle}
            className="text-white hover:text-gray-200 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
          {/* Connection Warning */}
          {!isConnected && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="flex items-center">
                <AlertTriangle className="h-4 w-4 text-yellow-600 mr-2" />
                <div className="text-sm text-yellow-800">
                  <strong>AI Not Connected:</strong> Please configure your OpenAI API key in Settings to use AI features.
                </div>
              </div>
            </div>
          )}
          
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  message.type === 'user'
                    ? 'bg-primary-600 text-white'
                    : 'bg-white text-gray-800 border border-gray-200'
                }`}
              >
                <div className="flex items-start space-x-2">
                  {message.type === 'assistant' && (
                    <Bot className="h-4 w-4 text-primary-600 mt-1 flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <div className="whitespace-pre-wrap text-sm">{message.content}</div>
                    
                    {/* Action Buttons */}
                    {message.metadata?.actions && message.metadata.actions.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {message.metadata.actions.map((action, index) => (
                          <button
                            key={index}
                            onClick={() => handleActionClick(action)}
                            className="w-full flex items-center space-x-2 px-3 py-2 bg-primary-50 hover:bg-primary-100 border border-primary-200 rounded-md text-primary-700 text-sm transition-colors"
                          >
                            {action.icon}
                            <div className="flex-1 text-left">
                              <div className="font-medium">{action.label}</div>
                              <div className="text-xs opacity-75">{action.description}</div>
                            </div>
                            <ExternalLink className="h-3 w-3" />
                          </button>
                        ))}
                      </div>
                    )}
                    
                    {message.metadata?.caseName && (
                      <div className="mt-2 text-xs opacity-75">
                        📋 {message.metadata.caseName}
                      </div>
                    )}
                    <div className="text-xs opacity-75 mt-1">
                      {message.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-white text-gray-800 border border-gray-200 px-4 py-2 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Bot className="h-4 w-4 text-primary-600" />
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200 bg-white">
          {!isConnected ? (
            <div className="text-center py-4">
              <p className="text-sm text-gray-500 mb-3">
                AI features are disabled. Please configure your OpenAI API key in Settings.
              </p>
              <button
                type="button"
                onClick={() => navigate('/settings')}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                <Settings className="h-4 w-4 mr-2" />
                Go to Settings
              </button>
            </div>
          ) : (
            <>
              <div className="flex space-x-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Ask about cases, RTW plans, or get alerts..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  disabled={isLoading || !inputValue.trim()}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
              
              {/* Quick Action Suggestions */}
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setInputValue('Show me urgent alerts')}
                  className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors"
                >
                  🚨 Urgent Alerts
                </button>
                <button
                  type="button"
                  onClick={() => setInputValue('Case status summary')}
                  className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors"
                >
                  📊 Case Summary
                </button>
                <button
                  type="button"
                  onClick={() => setInputValue('Take me to cases')}
                  className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors"
                >
                  📁 Go to Cases
                </button>
                <button
                  type="button"
                  onClick={() => setInputValue('What are the best practices for RTW case management?')}
                  className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors"
                >
                  💡 RTW Tips
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
};

export default RTWChatbot;
