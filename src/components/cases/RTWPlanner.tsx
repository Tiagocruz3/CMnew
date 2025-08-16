import React, { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { 
  FileText, 
  Download, 
  Printer, 
  Brain, 
  Save, 
  RefreshCw, 
  AlertTriangle,
  CheckCircle,
  User,
  Building,
  Calendar,
  Clock,
  MapPin,
  Phone,
  Mail,
  X
} from 'lucide-react';
import { aiService } from '../../services/aiService';
import { useAISettingsStore } from '../../store/aiSettingsStore';
import { Case } from '../../types';

interface RTWPlannerProps {
  caseData: Case;
  onClose?: () => void;
  onPopulateFromAI?: (data: Partial<RTWFormData>) => void;
}

interface RTWFormData {
  workerName: string;
  claimNumber: string;
  jobTitle: string;
  workDaysHours: string;
  workLocation: string;
  employerName: string;
  dutiesTasks: string;
  workplaceSupports: string;
  dutiesToAvoid: string;
  medicalRestrictions: string;
  week1Hours: {
    mon: string; tue: string; wed: string; thu: string; fri: string; sat: string; sun: string; total: string;
  };
  week2Hours: {
    mon: string; tue: string; wed: string; thu: string; fri: string; sat: string; sun: string; total: string;
  };
  week3Hours: {
    mon: string; tue: string; wed: string; thu: string; fri: string; sat: string; sun: string; total: string;
  };
  week4Hours: {
    mon: string; tue: string; wed: string; thu: string; fri: string; sat: string; sun: string; total: string;
  };
  workLocationAddress: string;
  startDate: string;
  supervisorName: string;
  supervisorPosition: string;
  supervisorPhone: string;
  reviewDate: string;
  preparedByName: string;
  preparedByPosition: string;
  preparedByPhone: string;
  preparedOnDate: string;
  workerPhone: string;
  workerSignature: string;
  workerDate: string;
  coordinatorName: string;
  coordinatorPhone: string;
  coordinatorSignature: string;
  coordinatorDate: string;
  supervisorSignature: string;
  supervisorDate: string;
  healthPractitionerName: string;
  healthPractitionerPhone: string;
  healthPractitionerSignature: string;
  healthPractitionerDate: string;
  notes: string;
}

export interface RTWPlannerRef {
  populateFromAI: (data: Partial<RTWFormData>) => void;
}

const RTWPlanner = forwardRef<RTWPlannerRef, RTWPlannerProps>(({ caseData, onClose, onPopulateFromAI }, ref) => {
  const [formData, setFormData] = useState<RTWFormData>({
    workerName: '',
    claimNumber: '',
    jobTitle: '',
    workDaysHours: '',
    workLocation: '',
    employerName: '',
    dutiesTasks: '',
    workplaceSupports: '',
    dutiesToAvoid: '',
    medicalRestrictions: '',
    week1Hours: { mon: '', tue: '', wed: '', thu: '', fri: '', sat: '', sun: '', total: '' },
    week2Hours: { mon: '', tue: '', wed: '', thu: '', fri: '', sat: '', sun: '', total: '' },
    week3Hours: { mon: '', tue: '', wed: '', thu: '', fri: '', sat: '', sun: '', total: '' },
    week4Hours: { mon: '', tue: '', wed: '', thu: '', fri: '', sat: '', sun: '', total: '' },
    workLocationAddress: '',
    startDate: '',
    supervisorName: '',
    supervisorPosition: '',
    supervisorPhone: '',
    reviewDate: '',
    preparedByName: '',
    preparedByPosition: '',
    preparedByPhone: '',
    preparedOnDate: '',
    workerPhone: '',
    workerSignature: '',
    workerDate: '',
    coordinatorName: '',
    coordinatorPhone: '',
    coordinatorSignature: '',
    coordinatorDate: '',
    supervisorSignature: '',
    supervisorDate: '',
    healthPractitionerName: '',
    healthPractitionerPhone: '',
    healthPractitionerSignature: '',
    healthPractitionerDate: '',
    notes: ''
  });

  const [isLoading, setIsLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [isPopulatedFromAI, setIsPopulatedFromAI] = useState(false);
  const { isConnected } = useAISettingsStore();

  useEffect(() => {
    // Pre-fill form with case data
    if (caseData) {
      setFormData(prev => ({
        ...prev,
        workerName: `${caseData.worker.firstName} ${caseData.worker.lastName}`,
        claimNumber: caseData.claimNumber || '',
        jobTitle: (caseData.worker as any).jobTitle || '',
        employerName: caseData.employer.name || '',
        startDate: (caseData.rtwPlan as any)?.plannedStartDate || '',
        reviewDate: caseData.rtwPlan?.reviewDate || '',
        preparedByName: (caseData.caseManager as any)?.name || '',
        preparedByPosition: 'Case Manager',
        preparedByPhone: (caseData.caseManager as any)?.phone || '',
        preparedOnDate: new Date().toISOString().split('T')[0],
        coordinatorName: (caseData.caseManager as any)?.name || '',
        coordinatorPhone: (caseData.caseManager as any)?.phone || '',
        supervisorName: (caseData as any)?.supervisor?.name || '',
        supervisorPosition: (caseData as any)?.supervisor?.position || '',
        supervisorPhone: (caseData as any)?.supervisor?.phone || ''
      }));
    }
  }, [caseData]);

  const handleInputChange = (field: keyof RTWFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleWeekHoursChange = (week: 'week1Hours' | 'week2Hours' | 'week3Hours' | 'week4Hours', day: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [week]: {
        ...prev[week],
        [day]: value
      }
    }));
  };

  const calculateWeekTotal = (weekHours: any) => {
    const total = Object.keys(weekHours).reduce((sum, day) => {
      if (day !== 'total') {
        const hours = parseFloat(weekHours[day]) || 0;
        return sum + hours;
      }
      return sum;
    }, 0);
    return total.toString();
  };

  // Check if form is completed (all required fields filled)
  const isFormCompleted = () => {
    const requiredFields = [
      formData.workerName,
      formData.claimNumber,
      formData.jobTitle,
      formData.employerName,
      formData.dutiesTasks,
      formData.workplaceSupports,
      formData.dutiesToAvoid,
      formData.medicalRestrictions,
      formData.startDate,
      formData.reviewDate,
      formData.preparedByName,
      formData.preparedByPhone
    ];
    
    return requiredFields.every(field => field && field.trim() !== '');
  };

  // Add success message when populated from AI
  useEffect(() => {
    if (isPopulatedFromAI) {
      // Auto-hide the success message after 5 seconds
      const timer = setTimeout(() => {
        setIsPopulatedFromAI(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isPopulatedFromAI]);

  const generateAIRecommendations = async () => {
    if (!isConnected) {
      setAiError('AI features are not available. Please configure your OpenAI API key in Settings.');
      return;
    }

    setIsLoading(true);
    setAiError(null);

    try {
      const prompt = `Based on the following case information, please provide recommendations for a Return to Work plan:

Case Details:
- Worker: ${caseData.worker.firstName} ${caseData.worker.lastName}
- Injury: ${caseData.injuryDescription || 'Not specified'}
- Status: ${caseData.status}
- RTW Plan: ${caseData.rtwPlan ? 'Exists' : 'Not created'}

Please provide specific recommendations for:
1. Duties and tasks that can be safely undertaken
2. Workplace supports, aids, or modifications needed
3. Duties or tasks to be avoided
4. Medical restrictions to consider
5. Recommended hours progression over 4 weeks
6. Additional workplace considerations

Format as structured recommendations that can be directly used in an RTW plan.`;

      const result = await aiService.chatWithRTWExpert(prompt, caseData);
      
      // Parse AI response and update form
      const lines = result.split('\n').filter(line => line.trim());
      
      let currentSection = '';
      let dutiesTasks = '';
      let workplaceSupports = '';
      let dutiesToAvoid = '';
      let medicalRestrictions = '';
      let hoursRecommendation = '';

      lines.forEach(line => {
        const trimmedLine = line.trim();
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

      setFormData(prev => ({
        ...prev,
        dutiesTasks: dutiesTasks || prev.dutiesTasks,
        workplaceSupports: workplaceSupports || prev.workplaceSupports,
        dutiesToAvoid: dutiesToAvoid || prev.dutiesToAvoid,
        medicalRestrictions: medicalRestrictions || prev.medicalRestrictions
      }));

    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Failed to generate AI recommendations');
    } finally {
      setIsLoading(false);
    }
  };

  const generatePDF = async () => {
    if (!isFormCompleted()) {
      alert('Please complete all required fields before generating the PDF.');
      return;
    }

    try {
      // Create a new window with the formatted document
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert('Please allow pop-ups to generate the PDF.');
        return;
      }

      const documentContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Return to Work Arrangements - ${formData.workerName}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
            .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
            .section { margin-bottom: 30px; }
            .section h3 { color: #333; border-bottom: 1px solid #ccc; padding-bottom: 5px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
            .field { margin-bottom: 15px; }
            .field label { font-weight: bold; display: block; margin-bottom: 5px; }
            .field input { border: none; border-bottom: 1px solid #ccc; padding: 5px; width: 100%; }
            .hours-grid { display: grid; grid-template-columns: repeat(8, 1fr); gap: 10px; margin-bottom: 20px; }
            .hours-grid input { text-align: center; }
            .signature-section { border: 1px solid #ccc; padding: 15px; margin: 15px 0; }
            .signature-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; }
            @media print { body { margin: 20px; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Return To Work Arrangements</h1>
            <p>(includes proposed suitable or pre-injury employment)</p>
            <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; margin: 20px 0; border-radius: 5px;">
              <strong>Note:</strong> These return to work arrangements are not a new employment contract.
              These arrangements will be reviewed over time to ensure that the duties and hours are consistent 
              with your capacity for work and are helping to progress your return to work.
            </div>
          </div>

          <div class="section">
            <h3>Worker and Claim Details</h3>
            <div class="grid">
              <div class="field">
                <label>Name of worker</label>
                <input value="${formData.workerName}" readonly />
              </div>
              <div class="field">
                <label>WorkSafe claim number</label>
                <input value="${formData.claimNumber}" readonly />
              </div>
            </div>
          </div>

          <div class="section">
            <h3>Pre-injury work</h3>
            <div class="grid">
              <div class="field">
                <label>Job title</label>
                <input value="${formData.jobTitle}" readonly />
              </div>
              <div class="field">
                <label>Days/hours of work</label>
                <input value="${formData.workDaysHours}" readonly />
              </div>
              <div class="field">
                <label>Location</label>
                <input value="${formData.workLocation}" readonly />
              </div>
              <div class="field">
                <label>Name of employer</label>
                <input value="${formData.employerName}" readonly />
              </div>
            </div>
          </div>

          <div class="section">
            <h3>Return to work arrangements</h3>
            <div class="field">
              <label>Duties or tasks to be undertaken</label>
              <div style="min-height: 60px; border: 1px solid #ccc; padding: 10px; background: #f9f9f9;">
                ${formData.dutiesTasks.replace(/\n/g, '<br>')}
              </div>
            </div>
            <div class="field">
              <label>Workplace supports, aids or modifications to be provided</label>
              <div style="min-height: 60px; border: 1px solid #ccc; padding: 10px; background: #f9f9f9;">
                ${formData.workplaceSupports.replace(/\n/g, '<br>')}
              </div>
            </div>
            <div class="field">
              <label>Specific duties or tasks to be avoided</label>
              <div style="min-height: 60px; border: 1px solid #ccc; padding: 10px; background: #f9f9f9;">
                ${formData.dutiesToAvoid.replace(/\n/g, '<br>')}
              </div>
            </div>
            <div class="field">
              <label>Medical restrictions</label>
              <div style="min-height: 60px; border: 1px solid #ccc; padding: 10px; background: #f9f9f9;">
                ${formData.medicalRestrictions.replace(/\n/g, '<br>')}
              </div>
            </div>
          </div>

          <div class="section">
            <h3>Hours of work</h3>
            <p style="color: #666; font-style: italic;">(It is recommended that where reduced hours are required the hours are gradually increased where appropriate.)</p>
            
            ${['week1Hours', 'week2Hours', 'week3Hours', 'week4Hours'].map((week, weekIndex) => {
              const weekData = formData[week as keyof RTWFormData] as any;
              return `
                <div style="margin-bottom: 20px;">
                  <h4>Week ${weekIndex + 1}</h4>
                  <div class="hours-grid">
                    <div><label>Mon</label><input value="${weekData.mon || ''}" readonly /></div>
                    <div><label>Tue</label><input value="${weekData.tue || ''}" readonly /></div>
                    <div><label>Wed</label><input value="${weekData.wed || ''}" readonly /></div>
                    <div><label>Thu</label><input value="${weekData.thu || ''}" readonly /></div>
                    <div><label>Fri</label><input value="${weekData.fri || ''}" readonly /></div>
                    <div><label>Sat</label><input value="${weekData.sat || ''}" readonly /></div>
                    <div><label>Sun</label><input value="${weekData.sun || ''}" readonly /></div>
                    <div><label>Total</label><input value="${calculateWeekTotal(weekData as any)}" readonly style="background: #f0f0f0;" /></div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>

          <div class="section">
            <h3>Additional Details</h3>
            <div class="grid">
              <div class="field">
                <label>Work Location (address, team, department)</label>
                <input value="${formData.workLocationAddress}" readonly />
              </div>
              <div class="field">
                <label>Start date</label>
                <input value="${formData.startDate}" readonly />
              </div>
              <div class="field">
                <label>Review date</label>
                <input value="${formData.reviewDate}" readonly />
              </div>
              <div class="field">
                <label>Prepared on (date)</label>
                <input value="${formData.preparedOnDate}" readonly />
              </div>
            </div>
          </div>

          <div class="section">
            <h3>Key people involved in these return to work arrangements</h3>
            
            <div class="signature-section">
              <h4>Worker</h4>
              <p style="font-style: italic; margin-bottom: 15px;">I will participate in these return to work arrangements.</p>
              <div class="signature-grid">
                <div class="field">
                  <label>Name</label>
                  <input value="${formData.workerName}" readonly />
                </div>
                <div class="field">
                  <label>Phone</label>
                  <input value="${formData.workerPhone}" readonly />
                </div>
                <div class="field">
                  <label>Date</label>
                  <input value="${formData.workerDate}" readonly />
                </div>
              </div>
            </div>

            <div class="signature-section">
              <h4>Return to Work Coordinator</h4>
              <p style="font-style: italic; margin-bottom: 15px;">I will monitor and review these return to work arrangements.</p>
              <div class="signature-grid">
                <div class="field">
                  <label>Name</label>
                  <input value="${formData.coordinatorName}" readonly />
                </div>
                <div class="field">
                  <label>Phone</label>
                  <input value="${formData.coordinatorPhone}" readonly />
                </div>
                <div class="field">
                  <label>Date</label>
                  <input value="${formData.coordinatorDate}" readonly />
                </div>
              </div>
            </div>

            <div class="signature-section">
              <h4>Supervisor</h4>
              <p style="font-style: italic; margin-bottom: 15px;">I will implement these return to work arrangements in the work area.</p>
              <div class="signature-grid">
                <div class="field">
                  <label>Name</label>
                  <input value="${formData.supervisorName}" readonly />
                </div>
                <div class="field">
                  <label>Position</label>
                  <input value="${formData.supervisorPosition}" readonly />
                </div>
                <div class="field">
                  <label>Phone</label>
                  <input value="${formData.supervisorPhone}" readonly />
                </div>
                <div class="field">
                  <label>Date</label>
                  <input value="${formData.supervisorDate}" readonly />
                </div>
              </div>
            </div>

            <div class="signature-section">
              <h4>Treating health practitioner</h4>
              <p style="font-style: italic; margin-bottom: 15px;">These return to work arrangements are consistent with the worker's capacity.</p>
              <div class="signature-grid">
                <div class="field">
                  <label>Name</label>
                  <input value="${formData.healthPractitionerName}" readonly />
                </div>
                <div class="field">
                  <label>Phone</label>
                  <input value="${formData.healthPractitionerPhone}" readonly />
                </div>
                <div class="field">
                  <label>Date</label>
                  <input value="${formData.healthPractitionerDate}" readonly />
                </div>
              </div>
            </div>
          </div>

          ${formData.notes ? `
            <div class="section">
              <h3>Notes / Additional information</h3>
              <div style="min-height: 60px; border: 1px solid #ccc; padding: 10px; background: #f9f9f9;">
                ${formData.notes.replace(/\n/g, '<br>')}
              </div>
            </div>
          ` : ''}
        </body>
        </html>
      `;

      printWindow.document.write(documentContent);
      printWindow.document.close();
      
      // Wait for content to load then print
      printWindow.onload = () => {
        printWindow.print();
        printWindow.close();
      };
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF. Please try again.');
    }
  };

  useImperativeHandle(ref, () => ({
    populateFromAI: (data: Partial<RTWFormData>) => {
      console.log('RTW Planner: populateFromAI called with data:', data);
      
      // Ensure all fields are properly updated
      const updatedData = { ...data };
      
      // Handle week hours data specifically
      if (data.week1Hours) {
        updatedData.week1Hours = { ...formData.week1Hours, ...data.week1Hours };
      }
      if (data.week2Hours) {
        updatedData.week2Hours = { ...formData.week2Hours, ...data.week2Hours };
      }
      if (data.week3Hours) {
        updatedData.week3Hours = { ...formData.week3Hours, ...data.week3Hours };
      }
      if (data.week4Hours) {
        updatedData.week4Hours = { ...formData.week4Hours, ...data.week4Hours };
      }
      
      console.log('RTW Planner: Updated data structure:', updatedData);
      
      setFormData(prev => {
        const newData = { ...prev, ...updatedData };
        console.log('RTW Planner: New form data:', newData);
        return newData;
      });
      
      setIsPopulatedFromAI(true);
      console.log('RTW Planner: Fields updated, success message shown');
    }
  }));

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 border-b border-gray-200 pb-4">
        <div className="flex items-center">
          <FileText className="h-8 w-8 text-primary-600 mr-3" />
          <h2 className="text-2xl font-bold text-gray-900">Return to Work Planner</h2>
        </div>
        <div className="flex items-center space-x-3">
          {isConnected && (
            <>
              <button
                onClick={generateAIRecommendations}
                disabled={isLoading}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
              >
                {isLoading ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Brain className="h-4 w-4 mr-2" />
                )}
                {isLoading ? 'Generating...' : 'AI Assist'}
              </button>
              
              {/* Test button for AI population */}
              <button
                onClick={() => {
                  const testData = {
                    dutiesTasks: 'Test duties and tasks for RTW plan. This includes light administrative work, data entry, and basic office tasks.',
                    workplaceSupports: 'Test workplace supports including ergonomic chair, adjustable desk, regular breaks every 2 hours, and buddy system for complex tasks.',
                    dutiesToAvoid: 'Test duties to avoid including heavy lifting, prolonged standing, repetitive bending, and high-stress situations.',
                    medicalRestrictions: 'Test medical restrictions including no lifting over 5kg, avoid prolonged sitting over 2 hours, and regular movement breaks.',
                    week1Hours: { mon: '2', tue: '2', wed: '2', thu: '2', fri: '2', sat: '0', sun: '0', total: '10' },
                    week2Hours: { mon: '3', tue: '3', wed: '3', thu: '3', fri: '3', sat: '0', sun: '0', total: '15' },
                    week3Hours: { mon: '4', tue: '4', wed: '4', thu: '4', fri: '4', sat: '0', sun: '0', total: '20' },
                    week4Hours: { mon: '5', tue: '5', wed: '5', thu: '5', fri: '5', sat: '0', sun: '0', total: '25' }
                  };
                  console.log('Testing AI population with data:', testData);
                  setFormData(prev => ({ ...prev, ...testData }));
                  setIsPopulatedFromAI(true);
                }}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Test AI Populate
              </button>
            </>
          )}
          <button
            onClick={generatePDF}
            disabled={!isFormCompleted()}
            className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${
              isFormCompleted() 
                ? 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500' 
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
            title={isFormCompleted() ? 'Generate PDF Document' : 'Complete all required fields to generate PDF'}
          >
            <Download className="h-4 w-4 mr-2" />
            Generate PDF
          </button>
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
      </div>

      {/* Form Completion Status */}
      {!isFormCompleted() && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <AlertTriangle className="h-5 w-5 text-yellow-500 mr-3 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-yellow-800">Form Incomplete</h4>
              <p className="text-sm text-yellow-700 mt-1">
                Please complete all required fields before generating the PDF document.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* AI Population Success Message */}
      {isPopulatedFromAI && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-green-800">AI Fields Populated</h4>
              <p className="text-sm text-green-700 mt-1">
                The RTW Planner fields have been automatically populated with AI recommendations. Please review and adjust as needed.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* AI Error Display */}
      {aiError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <AlertTriangle className="h-5 w-5 text-red-500 mr-3 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-red-800">AI Recommendation Error</h4>
              <p className="text-sm text-red-700 mt-1">{aiError}</p>
            </div>
          </div>
        </div>
      )}

      {/* RTW Document Form */}
      <div className="space-y-8">
        {/* Document Header */}
        <div className="text-center border-b-2 border-gray-300 pb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Return To Work Arrangements</h1>
          <p className="text-gray-600 text-lg">
            (includes proposed suitable or pre-injury employment)
          </p>
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-800 text-sm">
              <strong>Note:</strong> These return to work arrangements are not a new employment contract.
              These arrangements will be reviewed over time to ensure that the duties and hours are consistent 
              with your capacity for work and are helping to progress your return to work.
            </p>
          </div>
        </div>

        {/* Worker and Claim Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Name of worker
            </label>
            <input
              type="text"
              value={formData.workerName}
              onChange={(e) => handleInputChange('workerName', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Enter worker name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              WorkSafe claim number
            </label>
            <input
              type="text"
              value={formData.claimNumber}
              onChange={(e) => handleInputChange('claimNumber', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Enter claim number"
            />
          </div>
        </div>

        {/* Pre-injury Work Details */}
        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Pre-injury work</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Job title
              </label>
              <input
                type="text"
                value={formData.jobTitle}
                onChange={(e) => handleInputChange('jobTitle', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Enter job title"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Days/hours of work
              </label>
              <input
                type="text"
                value={formData.workDaysHours}
                onChange={(e) => handleInputChange('workDaysHours', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="e.g., Monday-Friday, 8am-5pm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location
              </label>
              <input
                type="text"
                value={formData.workLocation}
                onChange={(e) => handleInputChange('workLocation', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Enter work location"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Name of employer
              </label>
              <input
                type="text"
                value={formData.employerName}
                onChange={(e) => handleInputChange('employerName', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Enter employer name"
              />
            </div>
          </div>
        </div>

        {/* Return to Work Arrangements */}
        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Return to work arrangements</h3>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Duties or tasks to be undertaken
              </label>
              <p className="text-xs text-gray-500 mb-2">
                (Describe the specific duties and tasks required. Include any physical and other requirements, e.g. lifting, sitting, rotation of tasks, etc.)
              </p>
              <textarea
                value={formData.dutiesTasks}
                onChange={(e) => handleInputChange('dutiesTasks', e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Describe the duties and tasks..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Workplace supports, aids or modifications to be provided
              </label>
              <p className="text-xs text-gray-500 mb-2">
                (Describe workplace supports, aids or modifications e.g. rest breaks, buddy system, special tools, equipment, training, etc.)
              </p>
              <textarea
                value={formData.workplaceSupports}
                onChange={(e) => handleInputChange('workplaceSupports', e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Describe workplace supports..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Specific duties or tasks to be avoided
              </label>
              <p className="text-xs text-gray-500 mb-2">
                (Describe the specific duties and tasks that are to be avoided or restricted e.g. no loading pallets, tasks only to be undertaken with assistance.)
              </p>
              <textarea
                value={formData.dutiesToAvoid}
                onChange={(e) => handleInputChange('dutiesToAvoid', e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Describe duties to avoid..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Medical restrictions
              </label>
              <p className="text-xs text-gray-500 mb-2">
                (Describe the restrictions on the most recent Certificate of Capacity or from other sources. Include dates/periods restrictions apply.)
              </p>
              <textarea
                value={formData.medicalRestrictions}
                onChange={(e) => handleInputChange('medicalRestrictions', e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Describe medical restrictions..."
              />
            </div>
          </div>
        </div>

        {/* Hours of Work */}
        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Hours of work
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            (It is recommended that where reduced hours are required the hours are gradually increased where appropriate.)
          </p>
          
          {['week1Hours', 'week2Hours', 'week3Hours', 'week4Hours'].map((week, weekIndex) => (
            <div key={week} className="mb-6">
              <h4 className="font-medium text-gray-900 mb-3">Week {weekIndex + 1}</h4>
              <div className="grid grid-cols-8 gap-2">
                {['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map((day) => (
                  <div key={day}>
                    <label className="block text-xs font-medium text-gray-700 mb-1 capitalize">
                      {day}
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="24"
                      step="0.5"
                      value={formData[week as keyof RTWFormData][day as keyof typeof formData.week1Hours]}
                      onChange={(e) => handleWeekHoursChange(week as any, day, e.target.value)}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                      placeholder="0"
                    />
                  </div>
                ))}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Total
                  </label>
                  <input
                    type="number"
                    value={calculateWeekTotal(formData[week as keyof RTWFormData])}
                    readOnly
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded bg-gray-50"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Additional Details */}
        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Additional Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Work Location (address, team, department)
              </label>
              <input
                type="text"
                value={formData.workLocationAddress}
                onChange={(e) => handleInputChange('workLocationAddress', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Enter work location details"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start date
              </label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => handleInputChange('startDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Review date
              </label>
              <input
                type="date"
                value={formData.reviewDate}
                onChange={(e) => handleInputChange('reviewDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Prepared on (date)
              </label>
              <input
                type="date"
                value={formData.preparedOnDate}
                onChange={(e) => handleInputChange('preparedOnDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
        </div>

        {/* Key People */}
        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Key people involved in these return to work arrangements
          </h3>
          
          {/* Worker */}
          <div className="mb-6 p-4 border border-gray-200 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-3 flex items-center">
              <User className="h-5 w-5 mr-2 text-blue-600" />
              Worker
            </h4>
            <p className="text-sm text-gray-600 mb-3">I will participate in these return to work arrangements.</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={formData.workerName}
                  onChange={(e) => handleInputChange('workerName', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={formData.workerPhone}
                  onChange={(e) => handleInputChange('workerPhone', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  value={formData.workerDate}
                  onChange={(e) => handleInputChange('workerDate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
          </div>

          {/* Return to Work Coordinator */}
          <div className="mb-6 p-4 border border-gray-200 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-3 flex items-center">
              <CheckCircle className="h-5 w-5 mr-2 text-green-600" />
              Return to Work Coordinator
            </h4>
            <p className="text-sm text-gray-600 mb-3">I will monitor and review these return to work arrangements.</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={formData.coordinatorName}
                  onChange={(e) => handleInputChange('coordinatorName', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={formData.coordinatorPhone}
                  onChange={(e) => handleInputChange('coordinatorPhone', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  value={formData.coordinatorDate}
                  onChange={(e) => handleInputChange('coordinatorDate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
          </div>

          {/* Supervisor */}
          <div className="mb-6 p-4 border border-gray-200 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-3 flex items-center">
              <Building className="h-5 w-5 mr-2 text-purple-600" />
              Supervisor
            </h4>
            <p className="text-sm text-gray-600 mb-3">I will implement these return to work arrangements in the work area.</p>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={formData.supervisorName}
                  onChange={(e) => handleInputChange('supervisorName', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
                <input
                  type="text"
                  value={formData.supervisorPosition}
                  onChange={(e) => handleInputChange('supervisorPosition', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={formData.supervisorPhone}
                  onChange={(e) => handleInputChange('supervisorPhone', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  value={formData.supervisorDate}
                  onChange={(e) => handleInputChange('supervisorDate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
          </div>

          {/* Treating Health Practitioner */}
          <div className="mb-6 p-4 border border-gray-200 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-3 flex items-center">
              <CheckCircle className="h-5 w-5 mr-2 text-red-600" />
              Treating health practitioner
            </h4>
            <p className="text-sm text-gray-600 mb-3">These return to work arrangements are consistent with the worker's capacity.</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={formData.healthPractitionerName}
                  onChange={(e) => handleInputChange('healthPractitionerName', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={formData.healthPractitionerPhone}
                  onChange={(e) => handleInputChange('healthPractitionerPhone', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  value={formData.healthPractitionerDate}
                  onChange={(e) => handleInputChange('healthPractitionerDate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Notes / Additional information</h3>
          <textarea
            value={formData.notes}
            onChange={(e) => handleInputChange('notes', e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="Enter any additional notes or information..."
          />
        </div>
      </div>

      {/* Print Styles */}
      <style jsx>{`
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            margin: 0;
            padding: 20px;
          }
          .print-break {
            page-break-before: always;
          }
        }
      `}</style>
    </div>
  );
});

export default RTWPlanner;
