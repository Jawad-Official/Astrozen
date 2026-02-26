import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Label } from '@/types/issue';
import { cn } from '@/lib/utils';
import { LABEL_COLOR_OPTIONS, LABEL_COLORS } from '@/lib/constants';
import { Tag, Palette, Check } from '@phosphor-icons/react';

interface LabelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  label?: Label;
  onSave: (name: string, color: Label['color']) => void;
}

export function LabelDialog({ open, onOpenChange, label, onSave }: LabelDialogProps) {
  const [name, setName] = useState(label?.name || '');
  const [color, setColor] = useState<Label['color']>(label?.color || 'blue');
  
  const handleSave = () => {
    if (name.trim()) {
      onSave(name.trim(), color);
      setName('');
      setColor('blue');
      onOpenChange(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      handleSave();
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] p-0 gap-0 bg-popover border-border overflow-hidden shadow-[0_0_80px_-12px_rgba(0,0,0,0.5)] outline-none rounded-2xl">
        <DialogHeader className="sr-only">
          <DialogTitle>{label ? 'Edit Label' : 'New Label'}</DialogTitle>
          <DialogDescription>
            Give your project custom labels to help you filter and categorize work.
          </DialogDescription>
        </DialogHeader>
        <motion.div 
          initial={{ opacity: 0, y: 10, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="flex flex-col"
        >
          <div className="px-6 py-3 border-b border-white/[0.03] flex items-center gap-2 text-[10px] font-bold text-white/20 uppercase tracking-[0.2em] bg-white/[0.01]">
            <span className="hover:text-white/40 cursor-default transition-colors">Workspace</span>
            <span className="opacity-30">/</span>
            <span className="text-primary/60">{label ? 'Edit Label' : 'New Label'}</span>
          </div>

          <div className="p-8 space-y-8" onKeyDown={handleKeyDown}>
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2 px-1">
                  <Tag className="h-3.5 w-3.5 text-white/20" />
                  <h3 className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em]">Label Name</h3>
                </div>
                <input 
                  placeholder="e.g. Bug, Feature, Priority" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  className="w-full text-2xl font-semibold bg-transparent border-none p-0 focus:outline-none placeholder:text-white/5 text-white/90 selection:bg-primary/30 tracking-tight" 
                  autoFocus 
                />
                <div className="h-px w-full bg-gradient-to-r from-primary/30 via-primary/5 to-transparent mt-1" />
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2 px-1">
                  <Palette className="h-3.5 w-3.5 text-white/20" />
                  <h3 className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em]">Select Color</h3>
                </div>
                <div className="flex items-center gap-3 flex-wrap p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                  {LABEL_COLOR_OPTIONS.map((c) => (
                    <motion.button
                      key={c}
                      whileHover={{ scale: 1.15 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setColor(c)}
                      className={cn(
                        'h-7 w-7 rounded-full transition-all border-2 flex items-center justify-center',
                        LABEL_COLORS[c],
                        color === c ? 'border-white/40 shadow-[0_0_15px_rgba(255,255,255,0.1)]' : 'border-transparent opacity-60 hover:opacity-100'
                      )}
                    >
                      {color === c && <Check className="h-3 w-3 text-white" weight="bold" />}
                    </motion.button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="px-6 py-5 border-t border-white/[0.03] flex items-center justify-between bg-black/40">
            <div className="flex items-center gap-4 text-white/10 select-none">
              <div className="flex items-center gap-1.5 opacity-50">
                <div className="flex items-center gap-1 px-1.5 py-0.5 rounded border border-white/10 bg-white/[0.02]">
                  <span className="text-[9px] font-black">⌘</span>
                </div>
                <div className="flex items-center gap-1 px-1.5 py-0.5 rounded border border-white/10 bg-white/[0.02]">
                  <span className="text-[9px] font-black">ENTER</span>
                </div>
              </div>
              <span className="text-[10px] font-bold tracking-widest uppercase opacity-20">Save Label</span>
            </div>
            
            <div className="flex items-center gap-3">
              <Button 
                type="button" 
                variant="glass" 
                onClick={() => onOpenChange(false)}
                className="h-9 text-[11px] font-bold px-5 transition-all uppercase tracking-wider"
              >
                Cancel
              </Button>
              <Button 
                variant="glass-primary"
                onClick={handleSave}
                disabled={!name.trim()}
                className="h-9 px-6 text-[11px] font-black transition-all disabled:opacity-20 disabled:shadow-none uppercase tracking-widest"
              >
                {label ? 'Save Changes' : 'Create Label'}
              </Button>
            </div>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
