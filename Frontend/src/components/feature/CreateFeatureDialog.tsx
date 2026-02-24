import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Feature, 
  FeatureStatus, 
  FeatureHealth, 
  FeatureType,
  FEATURE_STATUS_CONFIG,
  FEATURE_HEALTH_CONFIG
} from '@/types/feature';
import { Project, IssuePriority, PRIORITY_CONFIG } from '@/types/issue';
import { Team } from '@/types/auth';
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
import { Check, User, FolderSimple, Diamond } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { FeatureWindow } from '../FeatureWindow';

interface CreateFeatureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: Project[];
  teams: Team[];
  orgMembers: any[];
  selectedProjectId?: string | null;
  selectedTeamId?: string | null;
  defaultParentId?: string;
  onAddFeature: (feature: any) => Promise<void>;
}

const FEATURE_TYPE_CONFIG: Record<FeatureType, { label: string; icon: string }> = {
  new_capability: { label: 'New Capability', icon: '✨' },
  enhancement: { label: 'Enhancement', icon: '🔧' },
  experiment: { label: 'Experiment', icon: '🧪' },
  infrastructure: { label: 'Infrastructure', icon: '🏗️' },
};

export function CreateFeatureDialog({ 
  open, 
  onOpenChange, 
  projects, 
  teams, 
  orgMembers, 
  selectedProjectId, 
  selectedTeamId,
  defaultParentId,
  onAddFeature 
}: CreateFeatureDialogProps) {
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<FeatureType>('new_capability');
  const [status, setStatus] = useState<FeatureStatus>('discovery');
  const [priority, setPriority] = useState<IssuePriority>('none');
  const [health, setHealth] = useState<FeatureHealth>('on_track');
  const [projectId, setProjectId] = useState<string | undefined>(selectedProjectId || undefined);
  const [ownerId, setOwnerId] = useState<string | undefined>();
  const [createMore, setCreateMore] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setProjectId(selectedProjectId || undefined);
      if (selectedTeamId) {
        const teamProjects = projects.filter(p => p.teamId === selectedTeamId || p.teams?.includes(selectedTeamId));
        if (teamProjects.length === 1) {
          setProjectId(teamProjects[0].id);
        }
      }
    }
  }, [open, selectedProjectId, selectedTeamId, projects]);

  const availableProjects = selectedTeamId 
    ? projects.filter(p => p.teamId === selectedTeamId || p.teams?.includes(selectedTeamId))
    : projects;

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!name.trim() || !projectId || isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      await onAddFeature({ 
        name: name.trim(), 
        projectId,
        type,
        status,
        priority,
        health,
        problemStatement: description.trim() || undefined,
        ownerId
      });
      
      toast({ title: 'Feature created' });
      setName(''); 
      setDescription('');
      if (!createMore) {
        onOpenChange(false);
      }
    } catch (error: any) {
      toast({ 
        title: 'Failed to create feature', 
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

  const ownerMember = orgMembers.find(m => m.id === ownerId);
  const currentProject = projects.find(p => p.id === projectId);
  const currentTeam = teams.find(t => t.id === currentProject?.teamId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[850px] p-0 gap-0 bg-[#080808] border-white/[0.08] overflow-hidden shadow-[0_0_80px_-12px_rgba(0,0,0,0.7)] outline-none rounded-2xl">
        <DialogHeader className="sr-only">
          <DialogTitle>Create New Feature</DialogTitle>
          <DialogDescription>Fill in the details to create a new product feature for your team.</DialogDescription>
        </DialogHeader>
        <motion.div 
          initial={{ opacity: 0, y: 10, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="flex flex-col h-full max-h-[90vh]"
        >
          <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="flex flex-col h-full">
            <div className="px-6 py-4 border-b border-white/[0.03] flex items-center gap-2 text-[10px] font-bold text-white/20 uppercase tracking-[0.2em] bg-white/[0.01]">
              <span className="hover:text-white/40 cursor-default transition-colors">{currentTeam?.name || 'Workspace'}</span>
              <span className="opacity-30">/</span>
              <span className="hover:text-white/40 cursor-default transition-colors">{currentProject?.name || 'No Project'}</span>
              <span className="opacity-30">/</span>
              <span className="text-primary/60">New Feature</span>
            </div>

            <div className="flex flex-col md:flex-row h-full overflow-hidden">
              <div className="hidden md:flex w-1/4 border-r border-white/[0.03] p-8 flex-col items-center justify-start space-y-8 bg-white/[0.01]">
                <div className="relative group">
                  <div className="h-24 w-24 rounded-2xl bg-primary/5 border border-primary/20 flex items-center justify-center text-4xl shadow-2xl transition-all duration-500 group-hover:scale-105 group-hover:bg-primary/10">
                    {FEATURE_TYPE_CONFIG[type].icon}
                  </div>
                  <div className="absolute -inset-4 bg-primary/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                </div>
                
                <div className="space-y-6 w-full">
                  <div className="space-y-2">
                    <h3 className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em] text-center">Phase</h3>
                    <div className="flex flex-col gap-1">
                      <div className="h-8 flex items-center justify-center px-3 py-2 rounded-md border border-white/5 bg-white/5 gap-2">
                        <FeatureWindow.StatusIcon status={status} />
                        <span className={cn("text-xs font-bold uppercase", FEATURE_STATUS_CONFIG[status].color)}>
                          {FEATURE_STATUS_CONFIG[status].label}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em] text-center">Priority</h3>
                    <div className="flex flex-col items-center gap-1">
                      <div className="h-8 flex items-center justify-center px-3 py-2 rounded-md border border-white/5 bg-white/5">
                        <FeatureWindow.PriorityIcon priority={priority} />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em] text-center">Health</h3>
                    <div className="flex flex-col items-center gap-1">
                      <div className="h-8 flex items-center justify-center px-3 py-2 rounded-md border border-white/5 bg-white/5 gap-2">
                        <FeatureWindow.HealthIcon health={health} />
                        <span className={cn("text-xs font-bold uppercase", FEATURE_HEALTH_CONFIG[health].color)}>
                          {FEATURE_HEALTH_CONFIG[health].label}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 p-8 space-y-6 overflow-y-auto custom-scrollbar">
                  <div className="space-y-2">
                    <input 
                      placeholder="Feature name" 
                      value={name} 
                      onChange={(e) => setName(e.target.value)} 
                      className="w-full text-3xl font-semibold bg-transparent border-none p-0 focus:outline-none placeholder:text-white/[0.03] text-white/90 selection:bg-primary/30 tracking-tight" 
                      autoFocus 
                    />
                    <div className="h-px w-full bg-gradient-to-r from-primary/30 via-primary/5 to-transparent mt-1" />
                  </div>
                  
                  <textarea 
                    placeholder="Describe the problem this feature solves..." 
                    value={description} 
                    onChange={(e) => setDescription(e.target.value)} 
                    className="w-full min-h-[120px] resize-none bg-transparent border-none p-0 focus:outline-none placeholder:text-white/[0.03] text-lg leading-relaxed text-white/40 selection:bg-primary/20 font-medium" 
                  />
                  
                  <div className="flex flex-col gap-4 pt-4 border-t border-white/[0.03]">
                    <div className="flex items-center gap-2 text-white/30">
                      <Diamond className="w-4 h-4" />
                      <span className="text-[10px] font-bold uppercase tracking-widest">Feature Type: {FEATURE_TYPE_CONFIG[type].label}</span>
                    </div>
                  </div>
                </div>

                <div className="px-6 py-4 border-t border-white/[0.03] bg-white/[0.01] flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-1.5 p-1 rounded-lg bg-white/[0.03] border border-white/[0.05]">
                    <Select value={type} onValueChange={(v) => setType(v as FeatureType)}>
                      <SelectTrigger className="h-8 w-auto min-w-[140px] border-none bg-transparent hover:bg-white/5 transition-all text-[11px] rounded-md px-2 gap-2 focus:ring-0">
                        <span className="text-lg">{FEATURE_TYPE_CONFIG[type].icon}</span>
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

                    <Select value={status} onValueChange={(v) => setStatus(v as FeatureStatus)}>
                      <SelectTrigger className="h-8 w-auto min-w-[110px] border-none bg-transparent hover:bg-white/5 transition-all text-[11px] rounded-md px-2 gap-2 focus:ring-0">
                        <FeatureWindow.StatusIcon status={status} />
                        <span className={cn("font-bold uppercase tracking-wider", FEATURE_STATUS_CONFIG[status].color)}>
                          {FEATURE_STATUS_CONFIG[status].label}
                        </span>
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

                    <Select value={priority} onValueChange={(v) => setPriority(v as IssuePriority)}>
                      <SelectTrigger className="h-8 w-auto min-w-[100px] border-none bg-transparent hover:bg-white/5 transition-all text-[11px] rounded-md px-2 gap-2 focus:ring-0">
                        <div className="flex items-center gap-2">
                          <FeatureWindow.PriorityIcon priority={priority} />
                          <span className={cn("text-[10px] font-bold uppercase", PRIORITY_CONFIG[priority].color)}>
                            {PRIORITY_CONFIG[priority].label}
                          </span>
                        </div>
                      </SelectTrigger>
                      <SelectContent className="bg-[#0C0C0C] border-white/10">
                        {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                          <SelectItem key={key} value={key} className="text-xs focus:bg-white/5">
                            <div className="flex items-center gap-2">
                              <FeatureWindow.PriorityIcon priority={key as IssuePriority} />
                              <span className={cn("text-[10px] font-bold uppercase", config.color)}>{config.label}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <div className="w-px h-3 bg-white/5" />

                    <Select value={health} onValueChange={(v) => setHealth(v as FeatureHealth)}>
                      <SelectTrigger className="h-8 w-auto min-w-[100px] border-none bg-transparent hover:bg-white/5 transition-all text-[11px] rounded-md px-2 gap-2 focus:ring-0">
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

                  <div className="flex items-center gap-1.5 p-1 rounded-lg bg-white/[0.03] border border-white/[0.05]">
                    <Select value={ownerId || 'none'} onValueChange={(v) => setOwnerId(v === 'none' ? undefined : v)}>
                      <SelectTrigger className="h-8 w-auto min-w-[110px] border-none bg-transparent hover:bg-white/5 transition-all text-[11px] rounded-md px-2 gap-2 focus:ring-0">
                        {ownerMember ? (
                          <div className="h-4 w-4 rounded-full bg-primary/20 flex items-center justify-center text-[8px] font-bold text-primary shrink-0">
                            {ownerMember.first_name?.[0]}{ownerMember.last_name?.[0]}
                          </div>
                        ) : <User className="h-3.5 w-3.5 text-white/20" />}
                        <span className={cn("font-bold uppercase tracking-wider", ownerMember ? "text-white/60" : "text-white/20")}>
                          {ownerMember?.full_name || 'Owner'}
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

                  <div className="flex items-center gap-1.5 p-1 rounded-lg bg-white/[0.03] border border-white/[0.05]">
                    <Select value={projectId || 'none'} onValueChange={(v) => { 
                      setProjectId(v === 'none' ? undefined : v);
                    }}>
                      <SelectTrigger className={cn(
                        "h-8 w-auto min-w-[110px] border-none bg-transparent hover:bg-white/5 transition-all text-[11px] rounded-md px-2 gap-2 focus:ring-0",
                        !projectId && "text-white/20"
                      )}>
                        <FolderSimple className={cn("h-3.5 w-3.5", projectId ? "text-blue-400/60" : "text-white/10")} />
                        <span className="font-bold uppercase tracking-wider truncate max-w-[120px]">
                          {currentProject?.name || 'Project'}
                        </span>
                      </SelectTrigger>
                      <SelectContent className="bg-[#0C0C0C] border-white/10 max-h-[300px]">
                        <div className="px-3 py-2 text-[9px] font-black text-white/20 uppercase tracking-[0.2em] border-b border-white/5 mb-1">Select Project</div>
                        <SelectItem value="none" className="text-xs focus:bg-white/5 text-white/40">No Project</SelectItem>
                        {availableProjects.map((project) => (
                          <SelectItem key={project.id} value={project.id} className="text-xs focus:bg-white/5">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px]">{project.icon}</span>
                              <span>{project.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>

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
                  <span className="text-[10px] font-bold tracking-widest uppercase opacity-20">Create Feature</span>
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
                  disabled={!name.trim() || !projectId}
                  className="h-9 px-8 text-[11px] font-bold disabled:opacity-20 disabled:shadow-none uppercase tracking-widest rounded-xl"
                >
                  Create Feature
                </Button>
              </div>
            </div>
          </form>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
