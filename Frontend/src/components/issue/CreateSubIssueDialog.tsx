import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  IssueStatus, 
  IssuePriority, 
  IssueType, 
  STATUS_CONFIG, 
  PRIORITY_CONFIG,
  TYPE_CONFIG,
  Project,
  Issue
} from '@/types/issue';
import { Feature } from '@/types/feature';
import { Team } from '@/types/auth';
import { useToast } from '@/hooks/use-toast';
import { useIssueStore } from '@/store/issueStore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Check, User, FolderSimple, Package } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { 
  IssueStatusBadge, 
  IssuePriorityIcon, 
  IssueTypeIcon
} from './IssueAtomicComponents';

interface CreateSubIssueDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parentIssue: Issue;
  projects: Project[];
  features: Feature[];
  teams: Team[];
  orgMembers: any[];
  onAddIssue: (issue: any) => Promise<void>;
}

export function CreateSubIssueDialog({ 
  open, 
  onOpenChange, 
  parentIssue,
  projects, 
  features, 
  teams, 
  orgMembers, 
  onAddIssue 
}: CreateSubIssueDialogProps) {
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [issueType, setIssueType] = useState<IssueType>('task');
  const [status, setStatus] = useState<IssueStatus>('todo');
  const [priority, setPriority] = useState<IssuePriority>('none');
  const [assignee, setAssignee] = useState<string | undefined>();
  const [createMore, setCreateMore] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Inherited values from parent
  const parentFeature = features.find(f => f.id === parentIssue.featureId);
  const parentProject = parentFeature ? projects.find(p => p.id === parentFeature.projectId) : undefined;
  const parentTeam = teams.find(t => t.id === parentIssue.teamId);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!title.trim() || !parentIssue.featureId || !parentIssue.teamId || isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      await onAddIssue({ 
        title: title.trim(), 
        description: description.trim() || undefined, 
        issueType,
        status, 
        priority, 
        featureId: parentIssue.featureId,
        teamId: parentIssue.teamId,
        assignee,
        parentId: parentIssue.id
      });
      
      toast({ title: 'Sub-issue created' });
      setTitle(''); 
      setDescription(''); 
      if (!createMore) {
        onOpenChange(false);
      }
    } catch (error: any) {
      toast({ 
        title: 'Failed to create sub-issue', 
        description: error.response?.data?.detail || 'An error occurred',
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

  const assigneeMember = orgMembers.find(m => m.id === assignee);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[850px] p-0 gap-0 bg-popover border-border overflow-hidden shadow-[0_0_80px_-12px_rgba(0,0,0,0.5)] outline-none rounded-2xl">
        <DialogHeader className="sr-only">
          <DialogTitle>Sub-Issue of '{parentIssue.title}'</DialogTitle>
          <DialogDescription>Create a new sub-issue linked to {parentIssue.identifier}.</DialogDescription>
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
              <span className="hover:text-white/40 cursor-default transition-colors">{parentTeam?.name || 'Workspace'}</span>
              <span className="opacity-30">/</span>
              <span className="hover:text-white/40 cursor-default transition-colors">{parentProject?.name || 'No Project'}</span>
              <span className="opacity-30">/</span>
              <span className="hover:text-white/40 cursor-default transition-colors truncate max-w-[120px]">{parentIssue.title}</span>
              <span className="opacity-30">/</span>
              <span className="text-primary/60">New Sub-issue</span>
            </div>

            <div className="flex flex-col md:flex-row h-full overflow-hidden">
              {/* Left Column: Visuals/Summary */}
              <div className="hidden md:flex w-1/4 border-r border-white/[0.03] p-8 flex-col items-center justify-start space-y-8 bg-white/[0.01]">
                <div className="relative group">
                  <div className="h-24 w-24 rounded-2xl bg-primary/5 border border-primary/20 flex items-center justify-center text-4xl shadow-2xl transition-all duration-500 group-hover:scale-105 group-hover:bg-primary/10">
                    {issueType === 'bug' ? '🐛' : issueType === 'task' ? '✅' : '✨'}
                  </div>
                  <div className="absolute -inset-4 bg-primary/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                </div>
                
                <div className="space-y-6 w-full">
                  <div className="space-y-2">
                    <h3 className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em] text-center">Status</h3>
                    <div className="flex flex-col gap-1">
                      <IssueStatusBadge status={status} className="h-8 justify-center px-3 py-2" />
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
                </div>
              </div>

              {/* Middle/Right Column: Main Content */}
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 p-8 space-y-6 overflow-y-auto custom-scrollbar">
                  <div className="space-y-2">
                    <input 
                      placeholder="Sub-issue title" 
                      value={title} 
                      onChange={(e) => setTitle(e.target.value)} 
                      className="w-full text-3xl font-semibold bg-transparent border-none p-0 focus:outline-none placeholder:text-white/[0.03] text-white/90 selection:bg-primary/30 tracking-tight" 
                      autoFocus 
                    />
                    <div className="h-px w-full bg-gradient-to-r from-primary/30 via-primary/5 to-transparent mt-1" />
                  </div>
                  
                  <textarea 
                    placeholder="Add description..." 
                    value={description} 
                    onChange={(e) => setDescription(e.target.value)} 
                    className="w-full min-h-[150px] resize-none bg-transparent border-none p-0 focus:outline-none placeholder:text-white/[0.03] text-lg leading-relaxed text-white/40 selection:bg-primary/20 font-medium" 
                  />
                </div>

                {/* Property Selector Bar */}
                <div className="px-6 py-4 border-t border-white/[0.03] bg-white/[0.01] flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-1.5 p-1 rounded-lg bg-white/[0.03] border border-white/[0.05]">
                    <Select value={issueType} onValueChange={(v) => setIssueType(v as IssueType)}>
                      <SelectTrigger className="h-8 w-auto min-w-[100px] border-none bg-transparent hover:bg-white/5 transition-all text-[11px] rounded-md px-2 gap-2 focus:ring-0">
                        <IssueTypeIcon type={issueType} className="h-3.5 w-3.5" />
                        <span className="font-bold text-white/60 uppercase tracking-wider">{TYPE_CONFIG[issueType].label}</span>
                      </SelectTrigger>
                      <SelectContent className="bg-[#0C0C0C] border-white/10 shadow-2xl">
                        {Object.entries(TYPE_CONFIG).map(([key, config]) => (
                          <SelectItem key={key} value={key} className="text-xs focus:bg-white/5">
                            <div className="flex items-center gap-2">
                              <IssueTypeIcon type={key as IssueType} />
                              <span>{config.label}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <div className="w-px h-3 bg-white/5" />

                    <Select value={status} onValueChange={(v) => setStatus(v as IssueStatus)}>
                      <SelectTrigger className="h-8 w-auto min-w-[100px] border-none bg-transparent hover:bg-white/5 transition-all text-[11px] rounded-md px-2 gap-2 focus:ring-0">
                        <IssueStatusBadge status={status} />
                      </SelectTrigger>
                      <SelectContent className="bg-[#0C0C0C] border-white/10">
                        {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                          <SelectItem key={key} value={key} className="text-xs focus:bg-white/5">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold uppercase text-white/60">{config.label}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <div className="w-px h-3 bg-white/5" />

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
                  </div>

                  <div className="flex items-center gap-1.5 p-1 rounded-lg bg-white/[0.03] border border-white/[0.05]">
                    <Select value={assignee || 'none'} onValueChange={(v) => setAssignee(v === 'none' ? undefined : v)}>
                      <SelectTrigger className="h-8 w-auto min-w-[110px] border-none bg-transparent hover:bg-white/5 transition-all text-[11px] rounded-md px-2 gap-2 focus:ring-0">
                        {assigneeMember ? (
                          <div className="h-4 w-4 rounded-full bg-primary/20 flex items-center justify-center text-[8px] font-bold text-primary shrink-0">
                            {assigneeMember.first_name?.[0]}{assigneeMember.last_name?.[0]}
                          </div>
                        ) : <User className="h-3.5 w-3.5 text-white/20" />}
                        <span className={cn("font-bold uppercase tracking-wider", assigneeMember ? "text-white/60" : "text-white/20")}>
                          {assigneeMember?.full_name || 'Assignee'}
                        </span>
                      </SelectTrigger>
                      <SelectContent className="bg-[#0C0C0C] border-white/10">
                        <SelectItem value="none" className="text-xs focus:bg-white/5">Unassigned</SelectItem>
                        {orgMembers.map((member) => (
                          <SelectItem key={member.id} value={member.id} className="text-xs focus:bg-white/5">
                            <div className="flex items-center gap-2">
                              <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center text-[8px] font-bold text-primary">
                                {member.first_name?.[0]}{member.last_name?.[0]}
                              </div>
                              <span>{member.full_name}</span>
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
                  <span className="text-[10px] font-bold tracking-widest uppercase opacity-20">Create Sub-issue</span>
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
                  disabled={!title.trim()}
                  className="h-9 px-8 text-[11px] font-bold disabled:opacity-20 disabled:shadow-none uppercase tracking-widest rounded-xl"
                >
                  Create Sub-issue
                </Button>
              </div>
            </div>
          </form>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
