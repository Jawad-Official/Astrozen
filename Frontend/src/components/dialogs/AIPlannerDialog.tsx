import React, { useState, useEffect } from 'react';
import {
  MagicWand,
  ArrowClockwise
} from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { TextShimmer } from '@/components/ui/text-shimmer';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { aiService } from '@/services/ai.service';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface AIPlannerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId?: string;
  initialIdeaId?: string;
  initialIdeaName?: string;
}

export function AIPlannerDialog({ open, onOpenChange, projectId, initialIdeaId, initialIdeaName }: AIPlannerDialogProps) {
  const navigate = useNavigate();
  const [rawInput, setRawInput] = useState(initialIdeaName || '');
  const [loading, setLoading] = useState(false);

  // Sync initialIdeaName when it changes or dialog opens
  useEffect(() => {
    if (open) {
      setRawInput(initialIdeaName || '');
    }
  }, [open, initialIdeaName]);

  // Phase 1: Submit Idea
  const handleSubmitIdea = async () => {
    if (!rawInput.trim()) return;
    setLoading(true);
    try {
      const res = await aiService.submitIdea(rawInput, projectId, initialIdeaName);
      const idea_id = res.data.id;
      const project_id = res.data.project_id;
      
      // Close dialog and navigate to the project's plan tab
      onOpenChange(false);
      navigate(`/projects/${project_id}?tab=plans&ideaId=${idea_id}`);
      toast.success("Project created and AI Architect initialized");
    } catch (error) {
      toast.error("Failed to submit project description");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] p-0 gap-0 bg-[#080808] border-white/[0.08] overflow-hidden shadow-[0_0_80px_-12px_rgba(0,0,0,0.7)] outline-none rounded-2xl flex flex-col">
        <DialogHeader className="sr-only">
          <DialogTitle>AI Project Architect</DialogTitle>
          <DialogDescription>
            Describe your project to generate a complete technical architecture.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex-1 flex items-center justify-center p-12">
            <div className="text-center space-y-4">
              <MagicWand size={48} weight="duotone" className="mx-auto text-primary mb-4 animate-pulse" />
              <TextShimmer className="text-xl font-bold" duration={1.5}>
                Generating Magic...
              </TextShimmer>
            </div>
          </div>
        ) : (
          <div className="p-8 space-y-6">
            <div className="flex items-center gap-3 mb-2">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <MagicWand size={24} weight="duotone" />
                </div>
                <div>
                  <h2 className="text-xl font-bold tracking-tight">Plan with AI</h2>
                  <p className="text-white/40 text-xs font-medium">Describe your vision and let the AI handle the architecture.</p>
                </div>
            </div>

            <div className="space-y-4">
              <Textarea
                placeholder="What are you building? e.g. A real-time dashboard for crypto traders with social features..."
                className="min-h-[250px] bg-white/[0.03] border-white/10 text-lg selection:bg-primary/30 leading-relaxed rounded-xl p-4 focus:border-primary/30 transition-all"
                value={rawInput}
                onChange={(e) => setRawInput(e.target.value)}
                autoFocus
              />

              <div className="flex justify-end pt-4">
                <Button
                  onClick={handleSubmitIdea}
                  disabled={loading || !rawInput.trim()}
                  className="px-8 h-11 font-bold tracking-tight bg-primary text-primary-foreground shadow-lg shadow-primary/20 rounded-xl w-full sm:w-auto"
                >
                  <MagicWand className="mr-2" weight="duotone" />
                  Start AI Planning
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}