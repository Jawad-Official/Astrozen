import { useState } from 'react';
import { motion } from 'framer-motion';
import { Feature, FeatureType, FeatureStatus, FeatureHealth, CreateFeatureData } from '@/types/feature';
import { IssuePriority, PRIORITY_CONFIG } from '@/types/issue';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Check, Package } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { IssuePriorityIcon } from '@/components/issue/IssueAtomicComponents';
import { FEATURE_STATUS_CONFIG, FEATURE_HEALTH_CONFIG, FeatureWindow } from '../FeatureWindow';

interface CreateSubFeatureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parentFeature: Feature;
  onAddFeature: (feature: CreateFeatureData) => Promise<void>;
}

const FEATURE_TYPE_CONFIG: Record<FeatureType, { label: string; icon: string }> = {
  new_capability: { label: 'New Capability', icon: '✨' },
  enhancement: { label: 'Enhancement', icon: '🔧' },
  experiment: { label: 'Experiment', icon: '🧪' },
  infrastructure: { label: 'Infrastructure', icon: '🏗️' },
};

export function CreateSubFeatureDialog({ 
  open, 
  onOpenChange, 
  parentFeature,
  onAddFeature 
}: CreateSubFeatureDialogProps) {
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [type, setType] = useState<FeatureType>('new_capability');
  const [priority, setPriority] = useState<IssuePriority>('none');
  const [status, setStatus] = useState<FeatureStatus>('discovery');
  const [health, setHealth] = useState<FeatureHealth>('on_track');
  const [createMore, setCreateMore] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!name.trim() || isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      await onAddFeature({ 
        projectId: parentFeature.projectId,
        name: name.trim(), 
        type,
        priority,
        status,
        health,
        parentId: parentFeature.id
      });
      
      toast({ title: 'Sub-feature created' });
      setName(''); 
      if (!createMore) {
        onOpenChange(false);
      }
    } catch (error: any) {
      const detail = error.response?.data?.detail;
      const description = Array.isArray(detail)
        ? detail.map((e: any) => e.msg).join(', ')
        : (typeof detail === 'string' ? detail : 'An error occurred');

      toast({ 
        title: 'Failed to create sub-feature', 
        description,
        variant: 'destructive' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      handleSubmit();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[850px] p-0 gap-0 bg-[#080808] border-white/[0.08] overflow-hidden shadow-[0_0_80px_-12px_rgba(0,0,0,0.7)] outline-none rounded-2xl">
        <DialogHeader className="sr-only">
          <DialogTitle>Sub-Feature of '{parentFeature.name}'</DialogTitle>
          <DialogDescription>Create a new sub-feature linked to {parentFeature.identifier}.</DialogDescription>
        </DialogHeader>
        <motion.div 
          initial={{ opacity: 0, y: 10, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="flex flex-col h-full max-h-[90vh]"
        >
          <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="flex flex-col h-full">
            {/* Context Breadcrumbs */}
            <div className="px-6 py-4 border-b border-white/[0.03] flex items-center gap-2 text-[10px] font-bold text-white/20 uppercase tracking-[0.2em] bg-white/[0.01]">
              <span className="hover:text-white/40 cursor-default transition-colors truncate max-w-[200px]">{parentFeature.name}</span>
              <span className="opacity-30">/</span>
              <span className="text-primary/60">New Sub-feature</span>
            </div>

            <div className="flex flex-col md:flex-row h-full overflow-hidden">
              {/* Left Column: Visuals/Summary */}
              <div className="hidden md:flex w-1/4 border-r border-white/[0.03] p-8 flex-col items-center justify-start space-y-8 bg-white/[0.01]">
                <div className="relative group">
                  <div className="h-24 w-24 rounded-2xl bg-primary/5 border border-primary/20 flex items-center justify-center text-4xl shadow-2xl transition-all duration-500 group-hover:scale-105 group-hover:bg-primary/10">
                    {FEATURE_TYPE_CONFIG[type].icon}
                  </div>
                  <div className="absolute -inset-4 bg-primary/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                </div>
                
                <div className="space-y-6 w-full">
                  <div className="space-y-2">
                    <h3 className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em] text-center">Type</h3>
                    <div className="flex flex-col gap-1">
                      <div className="h-8 flex items-center justify-center px-3 py-2 rounded-md border border-white/5 bg-white/5 text-xs text-white/60">
                        {FEATURE_TYPE_CONFIG[type].label}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em] text-center">Priority</h3>
                    <div className="flex flex-col items-center gap-1">
                      <div className="h-8 flex items-center justify-center px-3 py-2 rounded-md border border-white/5 bg-white/5">
                        <IssuePriorityIcon priority={priority} />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em] text-center">Phase</h3>
                    <div className="flex flex-col items-center gap-1">
                      <div className="h-8 flex items-center justify-center px-3 py-2 rounded-md border border-white/5 bg-white/5">
                        <FeatureWindow.StatusIcon status={status} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Middle/Right Column: Main Content */}
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 p-8 space-y-6 overflow-y-auto custom-scrollbar">
                  <div className="space-y-2">
                    <input 
                      placeholder="Sub-feature name" 
                      value={name} 
                      onChange={(e) => setName(e.target.value)} 
                      className="w-full text-3xl font-semibold bg-transparent border-none p-0 focus:outline-none placeholder:text-white/[0.03] text-white/90 selection:bg-primary/30 tracking-tight" 
                      autoFocus 
                    />
                    <div className="flex items-center gap-2 mt-1 px-0.5">
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20">Sub-feature of</span>
                      <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-primary/5 border border-primary/10">
                        <Package className="h-3 w-3 text-primary/40" />
                        <span className="text-[10px] font-bold text-primary/60 uppercase tracking-wider">{parentFeature.name}</span>
                      </div>
                    </div>
                    <div className="h-px w-full bg-gradient-to-r from-primary/30 via-primary/5 to-transparent mt-4" />
                  </div>
                </div>

                {/* Property Selector Bar */}
                <div className="px-6 py-4 border-t border-white/[0.03] bg-white/[0.01] flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-1.5 p-1 rounded-lg bg-white/[0.03] border border-white/[0.05]">
                    {/* Type Selector */}
                    <Select value={type} onValueChange={(v) => setType(v as FeatureType)}>
                      <SelectTrigger className="h-8 w-auto min-w-[140px] border-none bg-transparent hover:bg-white/5 transition-all text-[11px] rounded-md px-2 gap-2 focus:ring-0">
                        <span className="text-xl">{FEATURE_TYPE_CONFIG[type].icon}</span>
                        <span className="font-bold text-white/60 uppercase tracking-wider">{FEATURE_TYPE_CONFIG[type].label}</span>
                      </SelectTrigger>
                      <SelectContent className="bg-[#0C0C0C] border-white/10 shadow-2xl">
                        {Object.entries(FEATURE_TYPE_CONFIG).map(([key, config]) => (
                          <SelectItem key={key} value={key} className="text-xs focus:bg-white/5">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{config.icon}</span>
                              <span>{config.label}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <div className="w-px h-3 bg-white/5" />

                    {/* Priority Selector */}
                    <Select value={priority} onValueChange={(v) => setPriority(v as IssuePriority)}>
                      <SelectTrigger className="h-8 w-auto min-w-[100px] border-none bg-transparent hover:bg-white/5 transition-all text-[11px] rounded-md px-2 gap-2 focus:ring-0">
                        <div className="flex items-center gap-2">
                          <IssuePriorityIcon priority={priority} />
                          <span className={cn("text-[10px] font-bold uppercase", PRIORITY_CONFIG[priority].color)}>
                            {PRIORITY_CONFIG[priority].label}
                          </span>
                        </div>
                      </SelectTrigger>
                      <SelectContent className="bg-[#0C0C0C] border-white/10">
                        {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                          <SelectItem key={key} value={key} className="text-xs focus:bg-white/5">
                            <div className="flex items-center gap-2">
                              <IssuePriorityIcon priority={key as IssuePriority} />
                              <span className={cn("text-[10px] font-bold uppercase", config.color)}>{config.label}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <div className="w-px h-3 bg-white/5" />

                    {/* Status (Phase) Selector */}
                    <Select value={status} onValueChange={(v) => setStatus(v as FeatureStatus)}>
                      <SelectTrigger className="h-8 w-auto min-w-[120px] border-none bg-transparent hover:bg-white/5 transition-all text-[11px] rounded-md px-2 gap-2 focus:ring-0">
                        <div className="flex items-center gap-2">
                          <FeatureWindow.StatusIcon status={status} />
                          <span className={cn("text-[10px] font-bold uppercase", FEATURE_STATUS_CONFIG[status].color)}>
                            {FEATURE_STATUS_CONFIG[status].label}
                          </span>
                        </div>
                      </SelectTrigger>
                      <SelectContent className="bg-[#0C0C0C] border-white/10">
                        {Object.entries(FEATURE_STATUS_CONFIG).map(([key, config]) => (
                          <SelectItem key={key} value={key} className="text-xs focus:bg-white/5">
                            <div className="flex items-center gap-2">
                              <FeatureWindow.StatusIcon status={key as FeatureStatus} />
                              <span className={cn("text-[10px] font-bold uppercase", config.color)}>{config.label}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <div className="w-px h-3 bg-white/5" />

                    {/* Health Selector */}
                    <Select value={health} onValueChange={(v) => setHealth(v as FeatureHealth)}>
                      <SelectTrigger className="h-8 w-auto min-w-[120px] border-none bg-transparent hover:bg-white/5 transition-all text-[11px] rounded-md px-2 gap-2 focus:ring-0">
                        <div className="flex items-center gap-2">
                          <FeatureWindow.HealthIcon health={health} />
                          <span className={cn("text-[10px] font-bold uppercase", FEATURE_HEALTH_CONFIG[health].color)}>
                            {FEATURE_HEALTH_CONFIG[health].label}
                          </span>
                        </div>
                      </SelectTrigger>
                      <SelectContent className="bg-[#0C0C0C] border-white/10">
                        {Object.entries(FEATURE_HEALTH_CONFIG).map(([key, config]) => (
                          <SelectItem key={key} value={key} className="text-xs focus:bg-white/5">
                            <div className="flex items-center gap-2">
                              <FeatureWindow.HealthIcon health={key as FeatureHealth} />
                              <span className={cn("text-[10px] font-bold uppercase", config.color)}>{config.label}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Bar */}
            <div className="px-6 py-5 border-t border-white/[0.03] flex items-center justify-between bg-black/40">
              <div className="flex items-center gap-8">
                <motion.div 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center gap-2.5 group cursor-pointer" 
                  onClick={() => setCreateMore(!createMore)}
                >
                  <div className={cn(
                    "h-4 w-4 rounded-[4px] border border-white/10 flex items-center justify-center transition-all duration-300",
                    createMore ? "bg-primary border-primary shadow-[0_0_15px_rgba(var(--primary-rgb),0.4)]" : "group-hover:border-white/30"
                  )}>
                    {createMore && <Check className="h-3 w-3 text-primary-foreground" weight="bold" />}
                  </div>
                  <span className="text-[11px] font-bold text-white/30 group-hover:text-white/50 transition-colors uppercase tracking-wider">Create more</span>
                </motion.div>

                <div className="flex items-center gap-4 text-white/10 select-none">
                  <div className="flex items-center gap-1.5 opacity-50">
                    <div className="flex items-center gap-1 px-1.5 py-0.5 rounded border border-white/10 bg-white/[0.02]">
                      <span className="text-[9px] font-black">⌘</span>
                    </div>
                    <div className="flex items-center gap-1 px-1.5 py-0.5 rounded border border-white/10 bg-white/[0.02]">
                      <span className="text-[9px] font-black">ENTER</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold tracking-widest uppercase opacity-20">Create Sub-feature</span>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Button 
                  type="button" 
                  variant="ghost" 
                  onClick={() => onOpenChange(false)}
                  className="h-9 text-[11px] font-bold px-5 uppercase tracking-wider text-white/40 hover:text-white hover:bg-white/5"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  variant="glass-primary"
                  disabled={!name.trim()}
                  className="h-9 px-8 text-[11px] font-bold disabled:opacity-20 disabled:shadow-none uppercase tracking-widest rounded-xl"
                >
                  Create Sub-feature
                </Button>
              </div>
            </div>
          </form>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
