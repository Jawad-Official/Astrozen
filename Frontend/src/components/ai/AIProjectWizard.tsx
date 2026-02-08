import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { IdeaInputForm } from './IdeaInputForm';
import { ChatInterface } from './ChatInterface';
import { ValidationReportView } from './ValidationReportView';
import { DocGenerationWizard } from './DocGenerationWizard';
import { BlueprintDashboard } from './BlueprintDashboard';
import { ideaValidatorClient } from '@/services/idea-validator';
import { useNavigate } from 'react-router-dom';
import { usePollValidation } from '@/hooks/usePollValidation';
import { useToast } from '@/hooks/use-toast';

interface AIProjectWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string | null;
}

export const AIProjectWizard: React.FC<AIProjectWizardProps> = ({ open, onOpenChange, projectId }) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  
  // Persistent state management
  const [step, setStep] = useState<'input' | 'clarify' | 'report' | 'blueprint' | 'docs'>(() => {
    return (localStorage.getItem('ai_wizard_step') as any) || 'input';
  });
  const [ideaId, setIdeaId] = useState<string | null>(() => {
    return localStorage.getItem('ai_wizard_idea_id');
  });
  const [history, setHistory] = useState<{ question: string, answer: string }[]>(() => {
    const saved = localStorage.getItem('ai_wizard_history');
    return saved ? JSON.parse(saved) : [];
  });
  const [currentQuestion, setCurrentQuestion] = useState(() => {
    return localStorage.getItem('ai_wizard_question') || 'Could you tell me more about the core problem this project solves?';
  });
  const [progressInfo, setProgressInfo] = useState(() => {
    const saved = localStorage.getItem('ai_wizard_progress');
    return saved ? JSON.parse(saved) : { current: 0, total: 5 };
  });

  const [isLoading, setIsLoading] = useState(false);
  const { report, isLoading: isPolling, error } = usePollValidation(ideaId);

  // Force reset when opening for a NEW project (if projectId is provided but we don't have a matching ideaId, or if it's a fresh open)
  useEffect(() => {
    if (open) {
      const savedIdeaId = localStorage.getItem('ai_wizard_idea_id');
      const savedStep = localStorage.getItem('ai_wizard_step');
      
      // If we are opening and don't explicitly want to RESUME (we'll implement resume later), 
      // or if the saved idea doesn't match a resume criteria, reset.
      // For now, if it's opened from the "New Project" button, we reset.
      if (!savedIdeaId || savedStep === 'done') {
        clearPersistence();
        setStep('input');
        setIdeaId(null);
        setHistory([]);
        setCurrentQuestion('Could you tell me more about the core problem this project solves?');
        setProgressInfo({ current: 0, total: 5 });
      }
    }
  }, [open]);

  // Sync state to localStorage
  useEffect(() => {
    if (ideaId && step !== 'input') {
      localStorage.setItem('ai_wizard_step', step);
      localStorage.setItem('ai_wizard_idea_id', ideaId);
      localStorage.setItem('ai_wizard_history', JSON.stringify(history));
      localStorage.setItem('ai_wizard_question', currentQuestion);
      localStorage.setItem('ai_wizard_progress', JSON.stringify(progressInfo));
    }
  }, [step, ideaId, history, currentQuestion, progressInfo]);

  const clearPersistence = () => {
    localStorage.removeItem('ai_wizard_step');
    localStorage.removeItem('ai_wizard_idea_id');
    localStorage.removeItem('ai_wizard_history');
    localStorage.removeItem('ai_wizard_question');
    localStorage.removeItem('ai_wizard_progress');
  };

  const handleIdeaSubmit = async (idea: string) => {
    setIsLoading(true);
    try {
      const response = await ideaValidatorClient.createIdea(idea, projectId || undefined);
      setIdeaId(response.id);
      setStep('clarify');
      // No history yet, just the initial idea
    } catch (error: any) {
      console.error('Failed to create idea:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.detail || 'Failed to start AI architect',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswerSubmit = async (answer: string) => {
    if (!ideaId) return;
    setIsLoading(true);
    try {
      const newHistory = [...history, { question: currentQuestion, answer }];
      setHistory(newHistory);

      const response = await ideaValidatorClient.submitAnswer(ideaId, answer, newHistory);
      if (response.is_complete) {
        setStep('report');
        await ideaValidatorClient.startValidation(ideaId, newHistory);
      } else if (response.next_question) {
        setCurrentQuestion(response.next_question);
        setProgressInfo({
          current: response.current_question_index || (progressInfo.current + 1),
          total: 7 // Enforced 7 question limit
        });
      }
    } catch (error: any) {
      console.error('Failed to submit answer:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.detail || 'Failed to process answer',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefine = async (section: string, prompt: string) => {
    if (!ideaId) return;
    setIsLoading(true);
    try {
      await ideaValidatorClient.refineValidation(ideaId, section, prompt);
      toast({ title: 'Section regenerated', description: `AI has updated the ${section.replace('_', ' ')} based on your feedback.` });
    } catch (err) {
      toast({ title: 'Refinement failed', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = async (refinedDesc?: string) => {
    if (!ideaId) return;
    setIsLoading(true);
    try {
      await ideaValidatorClient.confirmIdea(ideaId, refinedDesc);
      setStep('blueprint');
      toast({
        title: 'Validation accepted',
        description: 'Generating your project blueprint...',
      });
    } catch (err: any) {
      console.error('Failed to confirm idea:', err);
      toast({
        title: 'Error',
        description: err.response?.data?.detail || 'Failed to confirm project idea',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBlueprintComplete = () => {
    setStep('docs');
    toast({
      title: 'Blueprint ready',
      description: 'Now, let\'s generate your technical documentation.',
    });
  };

  const handleDocsComplete = () => {
    onOpenChange(false);
    clearPersistence();
    toast({
      title: 'Project ready!',
      description: 'Your blueprint and documents are now available.',
    });
    if (projectId) {
      navigate(`/projects/${projectId}`);
    } else {
      navigate('/projects');
    }
  };


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] bg-[#080808] border-white/[0.08] text-white">
        <DialogHeader>
          <DialogTitle>AI Project Architect</DialogTitle>
          <DialogDescription className="text-white/40">
            Let AI help you plan your project, features, and documentation.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {step === 'input' && (
            <IdeaInputForm onSubmit={handleIdeaSubmit} isLoading={isLoading} />
          )}
          
          {step === 'clarify' && (
            <ChatInterface
              initialQuestion={currentQuestion}
              onAnswer={handleAnswerSubmit}
              isLoading={isLoading}
              currentIndex={progressInfo.current}
              totalQuestions={progressInfo.total}
            />
          )}

          {step === 'report' && (
            <div className="max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
              {isPolling ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-4">
                  <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-xl font-medium animate-pulse text-white">Architecting your project...</p>
                </div>
              ) : error ? (
                <div className="text-center text-red-500 py-10">
                  <p>{error}</p>
                  <button className="mt-4 underline" onClick={() => setStep('input')}>Back to Start</button>
                </div>
              ) : report ? (
                <ValidationReportView
                  report={report}
                  onConfirm={handleConfirm}
                  onRefine={handleRefine}
                  isLoading={isLoading}
                />
              ) : null}
            </div>
          )}

          {step === 'blueprint' && ideaId && (
            <div className="max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
              <BlueprintDashboard 
                ideaId={ideaId} 
                onContinue={handleBlueprintComplete} 
              />
            </div>
          )}

          {step === 'docs' && ideaId && (
            <DocGenerationWizard 
              ideaId={ideaId} 
              onComplete={handleDocsComplete} 
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
