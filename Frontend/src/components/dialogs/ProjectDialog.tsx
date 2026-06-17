import { useState } from 'react';
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
import { PROJECT_ICONS, LABEL_COLOR_OPTIONS, LABEL_COLORS, PROJECT_STATUS_CONFIG, PROJECT_PRIORITY_OPTIONS } from '@/lib/constants';
import { ProjectStatus, ProjectPriority } from '@/types/issue';
import { CaretDown, Check, MagicWand } from '@phosphor-icons/react';
import { aiService } from '@/services/ai.service';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface ProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project?: { 
    id: string; 
    name: string; 
    icon: string; 
    color: string;
    description?: string;
    status: ProjectStatus;
    priority: ProjectPriority;
  };
  onSave: (data: {
    name: string;
    icon: string;
    color: string;
    description: string;
    status: ProjectStatus;
    priority: ProjectPriority;
  }) => void;
  onPlanWithAI?: (name: string) => void;
}

export function ProjectDialog({ open, onOpenChange, project, onSave, onPlanWithAI }: ProjectDialogProps) {
  const navigate = useNavigate();
  const [name, setName] = useState(project?.name || '');
  const [icon, setIcon] = useState(project?.icon || '📁');
  const [color, setColor] = useState(project?.color || 'blue');
  const [description, setDescription] = useState(project?.description || '');
  const [status, setStatus] = useState<ProjectStatus>(project?.status || 'planned');
  const [priority, setPriority] = useState<ProjectPriority>(project?.priority || 'none');
  const [isPlanningWithAI, setIsPlanningWithAI] = useState(false);
  
  const handleSave = () => {
    if (name.trim()) {
      onSave({
        name: name.trim(),
        icon,
        color,
        description,
        status,
        priority
      });
      // Reset only if not editing
      if (!project) {
        setName('');
        setIcon('📁');
        setColor('blue');
        setDescription('');
        setStatus('planned');
        setPriority('none');
      }
      onOpenChange(false);
    }
  };

  const handlePlanWithAI = async () => {
    if (onPlanWithAI) {
      onPlanWithAI(name || "New AI Project");
      onOpenChange(false);
    } else {
      setIsPlanningWithAI(true);
      try {
        const res = await aiService.submitIdea(name || "New AI Project");
        const project_id = res.data.project_id;
        onOpenChange(false);
        navigate(`/projects/${project_id}?tab=plans&ideaId=${res.data.id}`);
        toast.success("AI Architect initialized");
      } catch (error) {
        toast.error("Failed to initialize AI Architect");
      } finally {
        setIsPlanningWithAI(false);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      handleSave();
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] p-0 gap-0 bg-popover border-border overflow-hidden shadow-[0_0_80px_-12px_rgba(0,0,0,0.5)] outline-none rounded-2xl">
        <DialogHeader className="sr-only">
          <DialogTitle>{project ? 'Edit Project' : 'New Project'}</DialogTitle>
          <DialogDescription>
            {project ? 'Update the details of your project.' : 'Create a new project to organize your team\'s work.'}
          </DialogDescription>
        </DialogHeader>
        <motion.div 
          initial={{ opacity: 0, y: 10, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="flex flex-col"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-border/50 flex items-center justify-between bg-muted/5">
            <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground/40 uppercase tracking-[0.2em]">
              <span className="hover:text-foreground cursor-default transition-colors">Workspace</span>
              <span className="opacity-30">/</span>
              <span className="text-primary/60">{project ? 'Edit Project' : 'New Project'}</span>
            </div>
            
            {!project && (
              <Button 
                size="sm" 
                variant="glass-primary" 
                className="h-7 text-[9px] font-black uppercase tracking-widest gap-2 px-3"
                onClick={handlePlanWithAI}
                disabled={isPlanningWithAI}
              >
                {isPlanningWithAI ? <Check className="animate-pulse" /> : <MagicWand weight="duotone" className="h-3 w-3" />}
                Plan with AI
              </Button>
            )}
          </div>

          <div className="flex flex-col md:flex-row h-full min-h-[450px]" onKeyDown={handleKeyDown}>
            {/* Left Column: Visuals */}
            <div className="w-full md:w-1/3 border-r border-border/50 p-8 flex flex-col items-center space-y-8 bg-muted/5">
              <div className="relative group">
                <div className={cn(
                  "h-32 w-32 rounded-3xl flex items-center justify-center text-6xl shadow-2xl transition-all duration-500",
                  LABEL_COLORS[color],
                  "bg-opacity-20 border-2 border-opacity-30",
                  color === 'red' && "border-[hsl(var(--label-red)/0.3)] text-[hsl(var(--label-red))] shadow-[hsl(var(--label-red)/0.15)]",
                  color === 'orange' && "border-[hsl(var(--label-orange)/0.3)] text-[hsl(var(--label-orange))] shadow-[hsl(var(--label-orange)/0.15)]",
                  color === 'yellow' && "border-[hsl(var(--label-yellow)/0.3)] text-[hsl(var(--label-yellow))] shadow-[hsl(var(--label-yellow)/0.15)]",
                  color === 'green' && "border-[hsl(var(--label-green)/0.3)] text-[hsl(var(--label-green))] shadow-[hsl(var(--label-green)/0.15)]",
                  color === 'blue' && "border-[hsl(var(--label-blue)/0.3)] text-[hsl(var(--label-blue))] shadow-[hsl(var(--label-blue)/0.15)]",
                  color === 'purple' && "border-[hsl(var(--label-purple)/0.3)] text-[hsl(var(--label-purple))] shadow-[hsl(var(--label-purple)/0.15)]",
                  color === 'pink' && "border-[hsl(var(--label-pink)/0.3)] text-[hsl(var(--label-pink))] shadow-[hsl(var(--label-pink)/0.15)]",
                )}>
                  {icon}
                </div>
                <div className="absolute -inset-4 bg-primary/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              </div>

              <div className="space-y-6 w-full">
                <div className="space-y-3">
                  <h3 className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-[0.2em] text-center">Color</h3>
                  <div className="flex flex-wrap justify-center gap-2">
                    {LABEL_COLOR_OPTIONS.map((c) => (
                      <button
                        key={c}
                        onClick={() => setColor(c)}
                        className={cn(
                          "h-6 w-6 rounded-full border-2 transition-all",
                          LABEL_COLORS[c],
                          color === c ? "border-border scale-110 shadow-lg" : "border-transparent hover:scale-105"
                        )}
                      />
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-[0.2em] text-center">Icon</h3>
                  <div className="grid grid-cols-5 gap-2">
                    {PROJECT_ICONS.map((i) => (
                      <button
                        key={i}
                        onClick={() => setIcon(i)}
                        className={cn(
                          "h-8 w-8 flex items-center justify-center rounded-lg text-lg transition-all",
                          icon === i ? "bg-accent text-foreground" : "text-muted-foreground/60 hover:bg-accent hover:text-foreground"
                        )}
                      >
                        {i}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Details */}
            <div className="flex-1 p-8 space-y-8">
              <div className="space-y-6">
                <div className="space-y-2">
                  <input 
                    placeholder="Project name" 
                    value={name} 
                    onChange={(e) => setName(e.target.value)} 
                    className="w-full text-3xl font-semibold bg-transparent border-none p-0 focus:outline-none placeholder:text-muted-foreground/20 text-foreground selection:bg-primary/30 tracking-tight" 
                    autoFocus 
                  />
                  <div className="h-px w-full bg-gradient-to-r from-muted/20 via-muted/20 to-transparent" />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-[0.2em]">Description</label>
                  <textarea 
                    placeholder="Add a brief description of this initiative..." 
                    value={description} 
                    onChange={(e) => setDescription(e.target.value)} 
                    className="w-full min-h-[100px] text-sm bg-transparent border-none p-0 focus:outline-none placeholder:text-muted-foreground/20 text-muted-foreground leading-relaxed resize-none" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8 pt-4 border-t border-border/50">
                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-[0.2em]">Status</label>
                  <div className="flex flex-wrap gap-2">
                    {(Object.keys(PROJECT_STATUS_CONFIG) as ProjectStatus[]).map((s) => (
                      <button
                        key={s}
                        onClick={() => setStatus(s)}
                        className={cn(
                          "px-3 py-1.5 rounded-full text-[11px] font-medium transition-all border",
                          status === s 
                            ? "bg-accent border-border text-foreground" 
                            : "bg-transparent border-border text-muted-foreground/60 hover:border-foreground/30 hover:text-foreground"
                        )}
                      >
                        {PROJECT_STATUS_CONFIG[s].label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-[0.2em]">Priority</label>
                  <div className="space-y-2">
                    {PROJECT_PRIORITY_OPTIONS.filter(o => o.value !== 'none' || priority === 'none').slice(0, 4).map((p) => (
                      <button
                        key={p.value}
                        onClick={() => setPriority(p.value)}
                        className={cn(
                          "w-full px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all flex items-center justify-between border",
                          priority === p.value 
                            ? "bg-muted/20 border-border text-foreground" 
                            : "bg-transparent border-transparent text-muted-foreground/60 hover:bg-muted/5 hover:text-foreground"
                        )}
                      >
                        <span className="flex items-center gap-2">
                          <div className={cn("h-1.5 w-1.5 rounded-full", p.color.replace('text-', 'bg-'))} />
                          {p.label}
                        </span>
                        {priority === p.value && <Check size={12} className="text-primary" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-5 border-t border-border/50 flex items-center justify-between bg-muted/20">
            <div className="flex items-center gap-4 text-muted-foreground/20 select-none">
              <div className="flex items-center gap-1.5 opacity-50">
                <div className="flex items-center gap-1 px-1.5 py-0.5 rounded border border-border/60 bg-muted/5">
                  <span className="text-[9px] font-black">⌘</span>
                </div>
                <div className="flex items-center gap-1 px-1.5 py-0.5 rounded border border-border/60 bg-muted/5">
                  <span className="text-[9px] font-black">ENTER</span>
                </div>
              </div>
              <span className="text-[10px] font-bold tracking-widest uppercase opacity-20">Save Project</span>
            </div>
            
            <div className="flex items-center gap-3">
              <Button 
                type="button" 
                variant="ghost" 
                onClick={() => onOpenChange(false)}
                className="h-9 text-[11px] font-bold px-5 transition-all uppercase tracking-wider text-muted-foreground/60 hover:text-foreground hover:bg-accent"
              >
                Cancel
              </Button>
              <Button 
                variant="glass-primary"
                onClick={handleSave}
                disabled={!name.trim()}
                className="h-9 px-8 text-[11px] font-bold transition-all disabled:opacity-20 disabled:shadow-none uppercase tracking-widest rounded-xl"
              >
                {project ? 'Update Project' : 'Create Project'}
              </Button>
            </div>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
