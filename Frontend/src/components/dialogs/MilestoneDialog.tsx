import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { 
  ChatTeardropText, 
  Target
} from '@phosphor-icons/react';

interface MilestoneDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  subtitle?: string;
  onSave: (data: {
    name: string;
    description: string;
    targetDate?: string;
    parentId?: string;
  }) => void;
  initialData?: {
    name?: string;
    description?: string;
    targetDate?: string;
    parentId?: string;
  };
}

export function MilestoneDialog({ 
  open, 
  onOpenChange, 
  title = "New Milestone", 
  subtitle = "Define a key phase or target in your timeline.",
  onSave,
  initialData
}: MilestoneDialogProps) {
  const [name, setName] = useState(initialData?.name || '');
  const [description, setDescription] = useState(initialData?.description || '');

  useEffect(() => {
    if (open) {
      setName(initialData?.name || '');
      setDescription(initialData?.description || '');
    }
  }, [open, initialData]);

  const handleSave = () => {
    if (name.trim()) {
      onSave({
        ...initialData,
        name: name.trim(),
        description: description.trim(),
      });
      onOpenChange(false);
    }
  };


  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      handleSave();
    }
  };

  const isEditing = !!initialData?.name;
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] p-0 gap-0 bg-[#080808] border-white/[0.08] overflow-hidden shadow-[0_0_80px_-12px_rgba(0,0,0,0.8)] outline-none rounded-[1.5rem] max-h-[90vh] flex flex-col">
        <DialogHeader className="sr-only">
          <DialogTitle>{isEditing ? 'Edit' : 'New'} {title}</DialogTitle>
          <DialogDescription>{subtitle}</DialogDescription>
        </DialogHeader>
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.99, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="flex flex-col h-full overflow-hidden"
        >
          {/* Refined Header */}
          <div className="px-8 pt-8 pb-4 shrink-0 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
            <div className="relative z-10">
              <h2 className="text-[10px] font-black text-primary uppercase tracking-[0.3em] opacity-80">
                {isEditing ? 'Edit' : 'Define'} Milestone
              </h2>
            </div>
          </div>

          <div className="h-px w-full bg-gradient-to-r from-transparent via-white/[0.05] to-transparent shrink-0" />

          {/* Form Content - Scrollable */}
          <div className="flex-1 overflow-y-auto px-8 py-8 space-y-10 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/5 hover:scrollbar-thumb-white/10 transition-colors" onKeyDown={handleKeyDown}>
            {/* Name Input */}
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <h4 className="text-[9px] font-bold text-white/20 uppercase tracking-[0.2em]">Title</h4>
                <div className="h-px flex-1 mx-4 bg-white/[0.03]" />
              </div>
              <div className="group relative">
                <input 
                  placeholder="e.g. Design System Foundation" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  className="w-full text-2xl font-bold bg-transparent border-none p-0 focus:outline-none placeholder:text-white/[0.02] text-white/90 selection:bg-primary/30 tracking-tight transition-all" 
                  autoFocus 
                />
                <motion.div 
                  initial={false}
                  animate={{ scaleX: name.length > 0 ? 1 : 0 }}
                  className="h-[2px] w-full bg-primary/40 mt-3 origin-left"
                />
              </div>
            </div>

            {/* Description Textarea */}
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <h4 className="text-[9px] font-bold text-white/20 uppercase tracking-[0.2em]">Description</h4>
                <div className="h-px flex-1 mx-4 bg-white/[0.03]" />
              </div>
              <div className="relative group">
                <div className="absolute inset-0 bg-white/[0.01] rounded-2xl group-focus-within:bg-white/[0.03] transition-colors pointer-events-none" />
                <textarea 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)} 
                  placeholder="What does success look like for this phase?"
                  className="w-full min-h-[160px] bg-transparent border border-white/[0.04] group-focus-within:border-primary/20 rounded-2xl px-5 py-4 text-sm text-white/60 focus:outline-none transition-all resize-none leading-relaxed placeholder:text-white/5 relative z-10"
                />
                <div className="absolute bottom-4 right-5 flex items-center gap-1.5 opacity-20 pointer-events-none z-10">
                  <ChatTeardropText size={14} weight="bold" />
                  <span className="text-[9px] font-bold uppercase tracking-tighter">Rich Content</span>
                </div>
              </div>
            </div>
          </div>

          {/* Premium Fixed Footer */}
          <div className="px-8 py-8 border-t border-white/[0.03] bg-[#0A0A0A]/95 backdrop-blur-3xl shrink-0">
            <div className="flex items-center gap-4">
              <Button 
                type="button" 
                variant="ghost" 
                onClick={() => onOpenChange(false)}
                className="flex-1 h-11 text-[10px] font-black transition-all uppercase tracking-[0.2em] text-white/30 hover:text-white hover:bg-white/5 rounded-xl border border-white/[0.03]"
              >
                Cancel
              </Button>
              <Button 
                variant="glass-primary"
                onClick={handleSave}
                disabled={!name.trim()}
                className="flex-[1.8] h-11 px-8 text-[10px] font-black transition-all disabled:opacity-10 disabled:scale-[0.98] uppercase tracking-[0.2em] rounded-xl shadow-[0_8px_30px_rgba(var(--primary-rgb),0.15)] relative overflow-hidden group"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-shimmer" />
                <span className="relative z-10">{isEditing ? 'Save Changes' : 'Create Milestone'}</span>
              </Button>
            </div>
            
            <div className="mt-4 flex justify-center">
              <p className="text-[9px] text-white/10 font-bold uppercase tracking-[0.1em] flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-white/10" />
                Press <span className="text-white/30">⌘+Enter</span> to quick save
                <span className="w-1 h-1 rounded-full bg-white/10" />
              </p>
            </div>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}

