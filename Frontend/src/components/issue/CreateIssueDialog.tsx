import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Issue, 
  IssueStatus, 
  IssuePriority, 
  IssueType,
  STATUS_CONFIG, 
  PRIORITY_CONFIG,
  TYPE_CONFIG,
  Project
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
import { Check, User, FolderSimple, Package, Target, CalendarBlank, Link as LinkIcon, X } from '@phosphor-icons/react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { 
  IssueStatusBadge, 
  IssuePriorityIcon, 
  IssueTypeIcon, 
  getStatusColorClass 
} from './IssueAtomicComponents';

interface CreateIssueDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: Project[];
  features: Feature[];
  teams: Team[];
  orgMembers: any[];
  selectedProjectId: string | null;
  selectedTeamId?: string | null;
  defaultParentId?: string;
  defaultMilestoneId?: string;
  onAddIssue: (issue: any) => Promise<void>;
}

export function CreateIssueDialog({ 
  open, 
  onOpenChange, 
  projects, 
  features, 
  teams, 
  orgMembers, 
  selectedProjectId, 
  selectedTeamId, 
  defaultParentId, 
  defaultMilestoneId,
  onAddIssue 
}: CreateIssueDialogProps) {
  const { issues } = useIssueStore();
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [issueType, setIssueType] = useState<IssueType>('task');
  const [status, setStatus] = useState<IssueStatus>('todo');
  const [priority, setPriority] = useState<IssuePriority>('none');
  const [projectId, setProjectId] = useState<string | undefined>(selectedProjectId || undefined);
  const [featureId, setFeatureId] = useState<string | undefined>();
  const [teamId, setTeamId] = useState<string | undefined>(selectedTeamId || undefined);
  const [assignee, setAssignee] = useState<string | undefined>();
  const [parentId, setParentId] = useState<string | undefined>(defaultParentId);
  const [milestoneId, setMilestoneId] = useState<string | undefined>(defaultMilestoneId);
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [newResource, setNewResource] = useState('');
  const [resources, setResources] = useState<{name: string, url: string, type: 'LINK'}[]>([]);
  const [createMore, setCreateMore] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  useEffect(() => {
      if (open) {
          setParentId(defaultParentId);
          setMilestoneId(defaultMilestoneId);
          setDueDate(undefined);
          setResources([]);
          setNewResource('');

          if (defaultMilestoneId) {
              const feat = features.find(f => f.milestones?.some(m => m.id === defaultMilestoneId));
              if (feat) {
                  setFeatureId(feat.id);
                  setProjectId(feat.projectId);
              }
          }

          if (defaultParentId) {
              const parent = issues.find(i => i.id === defaultParentId);
              if (parent) {
                   const parentFeature = features.find(f => f.id === parent.featureId);
                   if (parentFeature) {
                       setProjectId(parentFeature.projectId);
                       setFeatureId(parent.featureId);
                   }
                   setTeamId(parent.teamId);
              }
          }
      }
  }, [open, defaultParentId, defaultMilestoneId, issues, features]);
  
  // Determine available features based on selected project
  const projectFeatures = features.filter(f => !projectId || f.projectId === projectId);

  // Effect to update teamId when project changes or selectedTeamId changes
  useEffect(() => {
    if (projectId) {
      const project = projects.find(p => p.id === projectId);
      if (project?.teamId) {
        setTeamId(project.teamId);
      }
    } else if (selectedTeamId) {
        setTeamId(selectedTeamId);
    } else if (!teamId && teams.length > 0) {
        // Default to first team if no project selected and no team selected
        setTeamId(teams[0].id);
    }
  }, [projectId, projects, teams, teamId, selectedTeamId]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!title.trim() || !featureId || !teamId || isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      await onAddIssue({ 
        title: title.trim(), 
        description: description.trim() || undefined, 
        issueType,
        status, 
        priority, 
        featureId,
        milestoneId,
        dueDate: dueDate ? format(dueDate, 'yyyy-MM-dd') : undefined,
        resources: resources.length > 0 ? resources : undefined,
        teamId,
        assignee,
        parentId
      });
      
      toast({ title: 'Issue created' });
      setTitle(''); 
      setDescription('');
      setResources([]);
      setNewResource('');
      setDueDate(undefined);
      if (!createMore) {
        onOpenChange(false);
      }
    } catch (error: any) {
      toast({ 
        title: 'Failed to create issue', 
        description: error.response?.data?.detail || 'An error occurred',
        variant: 'destructive' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Cmd+Enter
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      handleSubmit();
    }
  };

  const assigneeMember = orgMembers.find(m => m.id === assignee);
  const currentFeature = features.find(f => f.id === featureId);
  const featureMilestones = currentFeature?.milestones || [];
  const currentTeam = teams.find(t => t.id === teamId);
  const currentProject = projects.find(p => p.id === projectId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[850px] p-0 gap-0 bg-popover border-border overflow-hidden shadow-[0_0_80px_-12px_rgba(0,0,0,0.5)] outline-none rounded-2xl">
        <DialogHeader className="sr-only">
          <DialogTitle>{parentId ? `Sub-Issue of '${issues.find(i => i.id === parentId)?.title || 'Issue'}'` : 'Create New Issue'}</DialogTitle>
          <DialogDescription>Fill in the details to create a new {parentId ? 'sub-' : ''}issue for your team.</DialogDescription>
        </DialogHeader>
        <motion.div 
          initial={{ opacity: 0, y: 10, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="flex flex-col h-full max-h-[90vh]"
        >
          <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="flex flex-col h-full">
            {/* Context Breadcrumbs */}
            <div className="px-6 py-4 border-b border-border/50 flex items-center gap-2 text-[10px] font-bold text-muted-foreground/40 uppercase tracking-[0.2em] bg-muted/10">
              <span className="hover:text-foreground cursor-default transition-colors">{currentTeam?.name || 'Workspace'}</span>
              <span className="opacity-30">/</span>
              <span className="hover:text-foreground cursor-default transition-colors">{currentProject?.name || 'No Project'}</span>
              {parentId && (() => {
                const parent = issues.find(i => i.id === parentId);
                return parent ? (
                  <>
                    <span className="opacity-30">/</span>
                    <span className="hover:text-foreground cursor-default transition-colors truncate max-w-[120px]">{parent.title}</span>
                  </>
                ) : null;
              })()}
              <span className="opacity-30">/</span>
              <span className="text-primary/60">{parentId ? 'New Sub-issue' : 'New Issue'}</span>
            </div>

            <div className="flex flex-col md:flex-row h-full overflow-hidden">
              {/* Left Column: Visuals/Summary */}
              <div className="hidden md:flex w-1/4 border-r border-border/50 p-8 flex-col items-center justify-start space-y-8 bg-muted/5">
                <div className="relative group">
                  <div className="h-24 w-24 rounded-2xl bg-primary/5 border border-primary/20 flex items-center justify-center text-4xl shadow-2xl transition-all duration-500 group-hover:scale-105 group-hover:bg-primary/10">
                    {issueType === 'bug' ? '🐛' : issueType === 'task' ? '✅' : '✨'}
                  </div>
                  <div className="absolute -inset-4 bg-primary/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                </div>
                
                <div className="space-y-6 w-full">
                  <div className="space-y-2">
                    <h3 className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] text-center">Status</h3>
                    <div className="flex flex-col gap-1">
                      <IssueStatusBadge status={status} className="h-8 justify-center px-3 py-2" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] text-center">Priority</h3>
                    <div className="flex flex-col items-center gap-1">
                      <div className="h-8 flex items-center justify-center px-3 py-2 rounded-md border border-border bg-muted/50">
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
                      placeholder="Issue title" 
                      value={title} 
                      onChange={(e) => setTitle(e.target.value)} 
                      className="w-full text-3xl font-semibold bg-transparent border-none p-0 focus:outline-none placeholder:text-muted-foreground/20 text-foreground selection:bg-primary/30 tracking-tight" 
                      autoFocus 
                    />
                    <div className="h-px w-full bg-gradient-to-r from-primary/30 via-primary/5 to-transparent mt-1" />
                  </div>
                  
                  <textarea 
                    placeholder="Add description..." 
                    value={description} 
                    onChange={(e) => setDescription(e.target.value)} 
                    className="w-full min-h-[150px] resize-none bg-transparent border-none p-0 focus:outline-none placeholder:text-muted-foreground/20 text-lg leading-relaxed text-foreground/70 selection:bg-primary/20 font-medium" 
                  />
                  
                  {/* Additional Fields: Due Date & Resources */}
                  <div className="flex flex-col gap-4 pt-4 border-t border-border/50">
                    <div className="flex items-center gap-6">
                       <Popover>
                        <PopoverTrigger asChild>
                          <button type="button" className={cn(
                            "flex items-center gap-2 text-xs font-medium transition-colors hover:text-foreground",
                            dueDate ? "text-primary" : "text-muted-foreground/60"
                          )}>
                            <CalendarBlank className="w-4 h-4" />
                            {dueDate ? format(dueDate, "MMM d, yyyy") : "Add Due Date"}
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 bg-popover border-border" align="start">
                          <Calendar
                            mode="single"
                            selected={dueDate}
                            onSelect={setDueDate}
                            initialFocus
                            className="bg-transparent"
                          />
                        </PopoverContent>
                      </Popover>
                      
                      <div className="flex-1 flex items-center gap-2">
                         <LinkIcon className="w-4 h-4 text-muted-foreground/40" />
                         <div className="flex-1 flex flex-wrap gap-2 items-center">
                            {resources.map((res, idx) => (
                               <div key={idx} className="flex items-center gap-1 bg-muted px-2 py-1 rounded text-xs text-foreground/70">
                                  <span className="truncate max-w-[150px]">{res.name}</span>
                                  <button type="button" onClick={() => setResources(resources.filter((_, i) => i !== idx))} className="hover:text-destructive transition-colors">
                                    <X className="w-3 h-3" />
                                  </button>
                               </div>
                            ))}
                            <div className="flex items-center gap-2">
                               <Input 
                                  placeholder="Add resource link (Press Enter)..." 
                                  value={newResource}
                                  onChange={(e) => setNewResource(e.target.value)}
                                  onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                          e.preventDefault();
                                          if (newResource.trim()) {
                                              setResources([...resources, { name: newResource, url: newResource, type: 'LINK' }]);
                                              setNewResource('');
                                          }
                                      }
                                  }}
                                  className="h-7 w-[200px] text-xs bg-muted/50 border-border focus:border-primary/50"
                               />
                            </div>
                         </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Property Selector Bar */}
                <div className="px-6 py-4 border-t border-border/50 bg-muted/10 flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-1.5 p-1 rounded-lg bg-card border border-border">
                    <Select value={issueType} onValueChange={(v) => setIssueType(v as IssueType)}>
                      <SelectTrigger className="h-8 w-auto min-w-[100px] border-none bg-transparent hover:bg-accent transition-all text-[11px] rounded-md px-2 gap-2 focus:ring-0">
                        <IssueTypeIcon type={issueType} className="h-3.5 w-3.5" />
                        <span className="font-bold text-muted-foreground uppercase tracking-wider">{TYPE_CONFIG[issueType].label}</span>
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border shadow-2xl">
                        {Object.entries(TYPE_CONFIG).map(([key, config]) => (
                          <SelectItem key={key} value={key} className="text-xs">
                            <div className="flex items-center gap-2">
                              <IssueTypeIcon type={key as IssueType} />
                              <span>{config.label}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <div className="w-px h-3 bg-border" />

                    <Select value={status} onValueChange={(v) => setStatus(v as IssueStatus)}>
                      <SelectTrigger className="h-8 w-auto min-w-[100px] border-none bg-transparent hover:bg-accent transition-all text-[11px] rounded-md px-2 gap-2 focus:ring-0">
                        <IssueStatusBadge status={status} />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border">
                        {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                          <SelectItem key={key} value={key} className="text-xs">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold uppercase text-muted-foreground">{config.label}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <div className="w-px h-3 bg-border" />

                    <Select value={priority} onValueChange={(v) => setPriority(v as IssuePriority)}>
                      <SelectTrigger className="h-8 w-auto min-w-[100px] border-none bg-transparent hover:bg-accent transition-all text-[11px] rounded-md px-2 gap-2 focus:ring-0">
                        <div className="flex items-center gap-1.5">
                          <IssuePriorityIcon priority={priority} />
                          <span className={cn("text-[10px] font-bold uppercase", PRIORITY_CONFIG[priority].color)}>
                            {PRIORITY_CONFIG[priority].label}
                          </span>
                        </div>
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border">
                        {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                          <SelectItem key={key} value={key} className="text-xs">
                            <div className="flex items-center gap-2">
                              <IssuePriorityIcon priority={key as IssuePriority} />
                              <span className={cn("text-[10px] font-bold uppercase", config.color)}>{config.label}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center gap-1.5 p-1 rounded-lg bg-card border border-border">
                    <Select value={assignee || 'none'} onValueChange={(v) => setAssignee(v === 'none' ? undefined : v)}>
                      <SelectTrigger className="h-8 w-auto min-w-[110px] border-none bg-transparent hover:bg-accent transition-all text-[11px] rounded-md px-2 gap-2 focus:ring-0">
                        {assigneeMember ? (
                          <div className="h-4 w-4 rounded-full bg-primary/20 flex items-center justify-center text-[8px] font-bold text-primary shrink-0">
                            {assigneeMember.first_name?.[0]}{assigneeMember.last_name?.[0]}
                          </div>
                        ) : <User className="h-3.5 w-3.5 text-muted-foreground/40" />}
                        <span className={cn("font-bold uppercase tracking-wider", assigneeMember ? "text-muted-foreground" : "text-muted-foreground/40")}>
                          {assigneeMember?.full_name || 'Assignee'}
                        </span>
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border">
                        <SelectItem value="none" className="text-xs">Unassigned</SelectItem>
                        {orgMembers.map((member) => (
                          <SelectItem key={member.id} value={member.id} className="text-xs">
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

                  {!parentId && (
                  <div className="flex items-center gap-1.5 p-1 rounded-lg bg-card border border-border">
                    <Select value={projectId || 'none'} onValueChange={(v) => { 
                      setProjectId(v === 'none' ? undefined : v);
                      setFeatureId(undefined); // Clear feature when project changes
                    }}>
                      <SelectTrigger className={cn(
                        "h-8 w-auto min-w-[110px] border-none bg-transparent hover:bg-accent transition-all text-[11px] rounded-md px-2 gap-2 focus:ring-0",
                        !projectId && "text-muted-foreground/40"
                      )}>
                        <FolderSimple className={cn("h-3.5 w-3.5", projectId ? "text-blue-600/60 dark:text-blue-400/60" : "text-muted-foreground/20")} />
                        <span className="font-bold uppercase tracking-wider truncate max-w-[120px]">
                          {currentProject?.name || 'Project'}
                        </span>
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border max-h-[300px]">
                        <div className="px-3 py-2 text-[9px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] border-b border-border mb-1">Select Project</div>
                        <SelectItem value="none" className="text-xs text-muted-foreground/60">No Project</SelectItem>
                        {projects.map((project) => (
                          <SelectItem key={project.id} value={project.id} className="text-xs">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px]">{project.icon}</span>
                              <span>{project.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <div className="w-px h-3 bg-border" />

                    <Select value={featureId || 'none'} onValueChange={(v) => {
                      const featId = v === 'none' ? undefined : v;
                      setFeatureId(featId);
                      if (featId) {
                        const selectedFeat = features.find(f => f.id === featId);
                        if (selectedFeat?.projectId && selectedFeat.projectId !== projectId) {
                          setProjectId(selectedFeat.projectId);
                        }
                      }
                      setMilestoneId(undefined);
                    }}>
                      <SelectTrigger className={cn(
                        "h-8 w-auto min-w-[110px] border-none bg-transparent hover:bg-accent transition-all text-[11px] rounded-md px-2 gap-2 focus:ring-0",
                        !featureId && "text-muted-foreground/40"
                      )}>
                        <Package className={cn("h-3.5 w-3.5", featureId ? "text-primary/60" : "text-muted-foreground/20")} />
                        <span className="font-bold uppercase tracking-wider truncate max-w-[120px]">
                          {currentFeature?.name || 'Feature'}
                        </span>
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border max-h-[300px]">
                        <div className="px-3 py-2 text-[9px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] border-b border-border mb-1">Select Feature</div>
                        {projectFeatures.map((feature) => (
                          <SelectItem key={feature.id} value={feature.id} className="text-xs">
                            <div className="flex items-center gap-2">
                              <span className="text-primary/40 text-[10px]">🔹</span>
                              <span>{feature.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  )}
                </div>
              </div>
            </div>

            {/* Action Bar */}
            <div className="px-6 py-5 border-t border-border/50 flex items-center justify-between bg-muted/20">
              <div className="flex items-center gap-8">
                <motion.div 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center gap-2.5 group cursor-pointer" 
                  onClick={() => setCreateMore(!createMore)}
                >
                  <div className={cn(
                    "h-4 w-4 rounded-[4px] border border-border flex items-center justify-center transition-all duration-300",
                    createMore ? "bg-primary border-primary shadow-[0_0_15px_rgba(var(--primary),0.4)]" : "group-hover:border-foreground/30"
                  )}>
                    {createMore && <Check className="h-3 w-3 text-primary-foreground" weight="bold" />}
                  </div>
                  <span className="text-[11px] font-bold text-muted-foreground/60 group-hover:text-foreground transition-colors uppercase tracking-wider">Create more</span>
                </motion.div>

                <div className="flex items-center gap-4 text-muted-foreground/20 select-none">
                  <div className="flex items-center gap-1.5 opacity-50">
                    <div className="flex items-center gap-1 px-1.5 py-0.5 rounded border border-border bg-muted/50">
                      <span className="text-[9px] font-black">⌘</span>
                    </div>
                    <div className="flex items-center gap-1 px-1.5 py-0.5 rounded border border-border bg-muted/50">
                      <span className="text-[9px] font-black">ENTER</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold tracking-widest uppercase opacity-20">Create Issue</span>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Button 
                  type="button" 
                  variant="ghost" 
                  onClick={() => onOpenChange(false)}
                  className="h-9 text-[11px] font-bold px-5 uppercase tracking-wider text-muted-foreground/60 hover:text-foreground hover:bg-accent"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  variant="default"
                  disabled={!title.trim() || !featureId || !teamId}
                  className="h-9 px-8 text-[11px] font-bold disabled:opacity-20 disabled:shadow-none uppercase tracking-widest rounded-xl"
                >
                  Create Issue
                </Button>
              </div>
            </div>
          </form>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
