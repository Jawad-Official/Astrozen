import React from 'react';
import { Check, X, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ChangeProposalProps {
  find: string;
  replace: string;
  onAccept: () => void;
  onReject: () => void;
}

export const ChangeProposal: React.FC<ChangeProposalProps> = ({
  find,
  replace,
  onAccept,
  onReject
}) => {
  return (
    <div className="my-3 rounded-lg border border-primary/25 bg-primary/5 p-4">
      <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-primary">Proposed Change</h4>
      
      <div className="space-y-4 mb-4">
        <div>
          <div className="mb-1 text-[10px] uppercase text-muted-foreground">Current Text</div>
          <div className="rounded border border-destructive/15 bg-destructive/5 p-2 text-sm text-muted-foreground line-through decoration-destructive/50">
            {find}
          </div>
        </div>
        
        <div className="flex justify-center">
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
        </div>
        
        <div>
          <div className="mb-1 text-[10px] uppercase text-muted-foreground">New Text</div>
          <div className="rounded border border-emerald-500/15 bg-emerald-500/5 p-2 text-sm text-foreground">
            {replace}
          </div>
        </div>
      </div>
      
      <div className="flex gap-2">
        <Button 
          size="sm" 
          className="flex-1"
          onClick={onAccept}
        >
          <Check className="mr-2 h-4 w-4" />
          Accept
        </Button>
        <Button 
          size="sm" 
          variant="outline" 
          className="flex-1"
          onClick={onReject}
        >
          <X className="mr-2 h-4 w-4" />
          Reject
        </Button>
      </div>
    </div>
  );
};
