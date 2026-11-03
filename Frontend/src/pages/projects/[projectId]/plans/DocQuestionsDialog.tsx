import { Dispatch, SetStateAction } from 'react';
import { Lightbulb } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { DocQuestion } from './types';
import { DOC_INFO } from './constants';

export const DocQuestionsDialog = ({
  docQuestionsOpen,
  setDocQuestionsOpen,
  docQuestionIndex,
  docQuestions,
  generatingDocType,
  docAiSuggestion,
  setDocAiSuggestion,
  handleDocQuestionAnswer,
  handleSkipAllQuestions,
  handleCancelQuestions,
}: {
  docQuestionsOpen: boolean;
  setDocQuestionsOpen: (open: boolean) => void;
  docQuestionIndex: number;
  docQuestions: DocQuestion[];
  generatingDocType: string | null;
  docAiSuggestion: string | null;
  setDocAiSuggestion: Dispatch<SetStateAction<string | null>>;
  handleDocQuestionAnswer: (answer: string) => Promise<void>;
  /** Fill every remaining answer with the AI suggestion and generate now. */
  handleSkipAllQuestions: () => Promise<void>;
  /** Closing the dialog abandons this generation. */
  handleCancelQuestions: () => void;
}) => {
  const current = docQuestions[docQuestionIndex];
  return (
    <Dialog
      open={docQuestionsOpen}
      onOpenChange={(open) => {
        setDocQuestionsOpen(open);
        if (!open) handleCancelQuestions();
      }}
    >
      <DialogContent className="bg-popover border-border w-[95vw] sm:max-w-[500px] p-4 sm:p-6 rounded-2xl shadow-2xl">
        <DialogHeader>
           <DialogTitle className="text-lg sm:text-xl">Clarification Needed</DialogTitle>
           <DialogDescription className="text-xs sm:text-sm">
              Question {docQuestionIndex + 1} of {docQuestions.length} for {DOC_INFO[generatingDocType || '']?.label}
           </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2 sm:py-4">
           <p className="text-base sm:text-lg font-medium leading-relaxed text-foreground/80">{current?.question}</p>
           {current?.suggestion && (
             <p className="text-[11px] sm:text-xs text-muted-foreground leading-5">
               <span className="font-semibold">AI suggestion:</span> {current.suggestion}
             </p>
           )}
           <Textarea
              value={docAiSuggestion || ''}
              onChange={e => setDocAiSuggestion(e.target.value)}
              placeholder="Your answer..."
              className="bg-muted/30 border-border min-h-[100px] text-sm sm:text-base text-foreground"
           />
           <div className="flex flex-col sm:flex-row justify-between gap-3 pt-2 sm:pt-4">
              <Button variant="ghost" size="sm" onClick={() => setDocAiSuggestion(current?.suggestion || '')} disabled={!current?.suggestion} className="text-[10px] sm:text-xs order-3 sm:order-1 w-full sm:w-auto hover:bg-accent">
                 <Lightbulb className="mr-2" /> Use Suggestion
              </Button>
              <div className="flex gap-2 order-1 sm:order-2 w-full sm:w-auto">
                 <Button variant="outline" size="sm" className="flex-1 sm:flex-none text-xs" onClick={() => handleDocQuestionAnswer(current?.suggestion || '')}>Skip</Button>
                 <Button size="sm" className="flex-1 sm:flex-none text-xs" onClick={() => handleDocQuestionAnswer(docAiSuggestion || '')} disabled={!docAiSuggestion?.trim()}>
                   {docQuestionIndex < docQuestions.length - 1 ? 'Next' : 'Generate'}
                 </Button>
              </div>
           </div>
           <button
             type="button"
             className="w-full text-center text-[11px] text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
             onClick={handleSkipAllQuestions}
           >
             Use AI suggestions for the rest and generate now
           </button>
        </div>
       </DialogContent>
     </Dialog>
  );
};
