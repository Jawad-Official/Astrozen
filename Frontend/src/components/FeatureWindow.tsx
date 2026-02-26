import { useMemo, useState, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Feature, FeatureStatus, FeatureHealth, FeatureMilestone, FeatureType } from '@/types/feature';
import { Project, IssuePriority, PRIORITY_CONFIG } from '@/types/issue';
import { Team } from '@/types/auth';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { 
  Square,
  CheckSquare,
  DotsThree,
  Trash,
  Plus,
  Diamond,
  CaretDown,
  CaretRight,
  WarningCircle,
  Archive,
  Binoculars,
  Flask,
  Gear,
  Star,
  Check,
  CheckCircle,
  CircleHalf,
  Circle,
  XCircle,
  X,
  NotePencil,
  Package,
  Sliders,
  Target,
  CornersIn,
  CornersOut,
  ArrowRight,
  User,
} from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import AgentPlan, { Task, Subtask } from './ui/agent-plan';
import { useToast } from '@/hooks/use-toast';
import { CreateSubFeatureDialog } from './feature/CreateSubFeatureDialog';

export const FEATURE_STATUS_CONFIG: Record<FeatureStatus, { label: string; color: string }> = {
  discovery: { label: 'Discovery', color: 'text-purple-600 dark:text-purple-400' },
  validated: { label: 'Validated', color: 'text-blue-600 dark:text-blue-400' },
  in_build: { label: 'In Build', color: 'text-yellow-600 dark:text-yellow-400' },
  in_review: { label: 'In Review', color: 'text-orange-600 dark:text-orange-400' },
  shipped: { label: 'Shipped', color: 'text-emerald-600 dark:text-emerald-400' },
  adopted: { label: 'Adopted', color: 'text-indigo-600 dark:text-indigo-400' },
  killed: { label: 'Killed', color: 'text-red-600 dark:text-red-400' },
};

export const FEATURE_HEALTH_CONFIG: Record<FeatureHealth, { label: string; color: string }> = {
  on_track: { label: 'On Track', color: 'text-emerald-600 dark:text-emerald-400' },
  at_risk: { label: 'At Risk', color: 'text-yellow-600 dark:text-yellow-400' },
  off_track: { label: 'Off Track', color: 'text-red-600 dark:text-red-400' },
};

export const FEATURE_TYPE_CONFIG: Record<FeatureType, { label: string; icon: string }> = {
  new_capability: { label: 'New Capability', icon: '✨' },
  enhancement: { label: 'Enhancement', icon: '🔧' },
  experiment: { label: 'Experiment', icon: '🧪' },
  infrastructure: { label: 'Infrastructure', icon: '🏗️' },
};

const PRIORITY_ORDER: IssuePriority[] = ['urgent', 'high', 'medium', 'low', 'none'];

export const FeatureWindow = {
  PriorityIcon: ({ priority, className }: { priority: string; className?: string }) => {
    const bars = priority === 'urgent' ? 4 : priority === 'high' ? 3 : priority === 'medium' ? 2 : priority === 'low' ? 1 : 0;
    const config = PRIORITY_CONFIG[priority as IssuePriority];
    return (
      <div className={cn('flex items-end gap-0.5 h-4 w-4', config?.color, className)}>
        {[1, 2, 3, 4].map((level) => (
          <div key={level} className={cn('w-[3px] transition-colors rounded-full', level <= bars ? 'bg-current' : 'bg-muted-foreground/20', level === 1 && 'h-1', level === 2 && 'h-2', level === 3 && 'h-3', level === 4 && 'h-4')} />
        ))}
      </div>
    );
  },

  StatusIcon: ({ status, className }: { status: FeatureStatus; className?: string }) => {
    const iconClass = cn('h-4 w-4', className);
    switch (status) {
      case 'discovery': return <Binoculars className={cn(iconClass, 'text-purple-600 dark:text-purple-400')} />;
      case 'validated': return <CheckCircle className={cn(iconClass, 'text-blue-600 dark:text-blue-400')} />;
      case 'in_build': return <Gear className={cn(iconClass, 'text-yellow-600 dark:text-yellow-400')} />;
      case 'in_review': return <CircleHalf className={cn(iconClass, 'text-orange-600 dark:text-orange-400')} />;
      case 'shipped': return <Archive className={cn(iconClass, 'text-emerald-600 dark:text-emerald-400')} />;
      case 'adopted': return <Star className={cn(iconClass, 'text-indigo-600 dark:text-indigo-400')} />;
      case 'killed': return <XCircle className={cn(iconClass, 'text-red-600 dark:text-red-400')} />;
      default: return <Circle className={iconClass} />;
    }
  },

  HealthIcon: ({ health, className }: { health: FeatureHealth; className?: string }) => {
    const iconClass = cn('h-3 w-3', className);
    switch (health) {
      case 'on_track': return <div className={cn("h-2 w-2 rounded-full bg-emerald-500", className)} />;
      case 'at_risk': return <div className={cn("h-2 w-2 rounded-full bg-yellow-500", className)} />;
      case 'off_track': return <div className={cn("h-2 w-2 rounded-full bg-red-500", className)} />;
      default: return <div className={cn("h-2 w-2 rounded-full bg-muted", className)} />;
    }
  },

  Row: ({ 
    feature, 
    projects, 
    teams,
    allFeatures,
    expanded,
    onToggleExpand,
    onUpdate, 
    onDelete, 
    onClick,
    onToggleMilestone,
    onUpdateMilestone,
    onDeleteMilestone,
    onAddMilestone,
    onAddSubFeature,
    onCreateIssueForMilestone,
    onDragOverPriority
  }: { 
    feature: Feature; 
    projects: Project[]; 
    teams?: Team[];
    allFeatures: Feature[];
    expanded: boolean;
    onToggleExpand: () => void;
    onUpdate: (id: string, updates: Partial<Feature>) => Promise<void>; 
    onDelete: (id: string) => Promise<void>; 
    onClick?: () => void;
    onToggleMilestone: (featureId: string, milestoneId: string) => Promise<void>;
    onUpdateMilestone: (featureId: string, milestoneId: string, updates: Partial<FeatureMilestone>) => Promise<void>;
    onDeleteMilestone: (featureId: string, milestoneId: string) => Promise<void>;
    onAddMilestone: (featureId: string, parentId?: string) => void;
    onAddSubFeature?: (parentFeature: Feature) => void;
    onCreateIssueForMilestone?: (featureId: string, milestoneId: string) => void;
    onDragOverPriority: (priority: IssuePriority) => void;
  }) => {
    const { toast } = useToast();
    const project = projects.find((p) => p.id === feature.projectId);
    const team = teams?.find(t => t.id === project?.teamId);
    const lastDraggedPriority = useRef<IssuePriority | null>(null);
    const [editingDescriptionId, setEditingDescriptionId] = useState<string | null>(null);
    const [tempDescription, setTempDescription] = useState('');

    const handleUpdateStatus = async (status: FeatureStatus) => {
      try {
        await onUpdate(feature.id, { status });
        toast({ title: 'Status updated' });
      } catch (error: any) {
        toast({ 
          title: 'Failed to update status', 
          description: error.response?.data?.detail || 'An error occurred',
          variant: 'destructive' 
        });
      }
    };

    const handleDelete = async () => {
      if (!confirm('Delete this feature?')) return;
      try {
        await onDelete(feature.id);
        toast({ title: 'Feature deleted' });
      } catch (error: any) {
        toast({ 
          title: 'Failed to delete feature', 
          description: error.response?.data?.detail || 'An error occurred',
          variant: 'destructive' 
        });
      }
    };

    const handleToggleMilestoneStatus = async (milestoneId: string) => {
      try {
        await onToggleMilestone(feature.id, milestoneId);
      } catch (error: any) {
        toast({ 
          title: 'Failed to update milestone', 
          description: error.response?.data?.detail || 'An error occurred',
          variant: 'destructive' 
        });
      }
    };
    
    return (
      <motion.div 
        layout
        drag="y"
        dragElastic={1} 
        whileDrag={{ 
          pointerEvents: "none", 
          zIndex: 100, 
          scale: 1.02,
          x: [-2, 2, -2, 2, 0], 
          rotate: [0, 0.5, -0.5, 0.5, 0], 
          boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.2), 0 8px 10px -6px rgb(0 0 0 / 0.2)"
        }}
        onDrag={(_, info) => {
          const x = info.point.x;
          const y = info.point.y;
          const priorityElements = document.querySelectorAll('[data-priority]');
          let closestPriority: IssuePriority | null = null;
          let minDistance = Infinity;

          priorityElements.forEach((el) => {
            const rect = el.getBoundingClientRect();
            // Distance to the rectangle
            const dx = Math.max(rect.left - x, 0, x - rect.right);
            const dy = Math.max(rect.top - y, 0, y - rect.bottom);
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < minDistance) {
              minDistance = distance;
              closestPriority = el.getAttribute('data-priority') as IssuePriority;
            }
          });

          if (closestPriority && closestPriority !== lastDraggedPriority.current) {
            lastDraggedPriority.current = closestPriority;
            onDragOverPriority(closestPriority);
          }
        }}
        onDragEnd={(_, info) => {
          const x = info.point.x;
          const y = info.point.y;
          const priorityElements = document.querySelectorAll('[data-priority]');
          let closestPriority: IssuePriority | null = null;
          let minDistance = Infinity;

          priorityElements.forEach((el) => {
            const rect = el.getBoundingClientRect();
            const dx = Math.max(rect.left - x, 0, x - rect.right);
            const dy = Math.max(rect.top - y, 0, y - rect.bottom);
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < minDistance) {
              minDistance = distance;
              closestPriority = el.getAttribute('data-priority') as IssuePriority;
            }
          });

          lastDraggedPriority.current = null;
          if (closestPriority && closestPriority !== feature.priority) {
            onUpdate(feature.id, { priority: closestPriority });
          }
        }}
        className="flex flex-col group/row"
      >
        <div 
          className={cn(
            'group relative grid grid-cols-[60px_32px_32px_1fr_100px_40px_140px_32px] items-center gap-2 px-4 py-2 cursor-grab active:cursor-grabbing transition-all duration-300 border-b border-border/20 last:border-none bg-secondary/20 hover:bg-secondary/40 first:rounded-t-xl last:rounded-b-xl hover:z-10 hover:scale-[1.01] select-none tracking-tight'
          )} 
          onClick={onClick}
        >
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-gradient-to-r from-primary/5 to-transparent pointer-events-none transition-opacity duration-500 rounded-xl" />
          
          <div className="flex justify-center">
            {feature.identifier && (
              <span className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-wider bg-muted px-1.5 py-0.5 rounded border border-border">
                {feature.identifier}
              </span>
            )}
          </div>

          <div className="flex justify-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <button className="relative z-20 hover:bg-muted p-1 rounded transition-colors">
                  <FeatureWindow.PriorityIcon priority={feature.priority || 'none'} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="bg-popover border-border backdrop-blur-md">
                {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                  <DropdownMenuItem key={key} onClick={(e) => {
                    e.stopPropagation();
                    onUpdate(feature.id, { priority: key as any });
                  }} className="focus:bg-muted">
                    <div className="flex items-center gap-2">
                      <FeatureWindow.PriorityIcon priority={key} />
                      <span className={cn("text-[10px] font-bold uppercase", config.color)}>{config.label}</span>
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <button 
            className="relative z-20 hover:bg-muted p-1 rounded-md transition-colors w-fit"
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand();
            }}
          >
            {expanded ? (
              <CaretDown className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <CaretRight className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </button>

          <div className="flex items-center gap-2 min-w-0 overflow-hidden">
            <span className="truncate text-sm font-medium tracking-tight text-foreground/90 group-hover:text-foreground transition-colors">
              {feature.name}
            </span>
            {feature.parentId && (
              <div className="flex items-center gap-1.5 text-muted-foreground/30 shrink-0">
                <span className="text-[10px] font-bold">&gt;</span>
                <span className="text-[11px] font-medium truncate max-w-[120px]">
                  {allFeatures?.find(f => f.id === feature.parentId)?.name || '...'}
                </span>
              </div>
            )}
          </div>

          <div className="flex justify-center">
            <Badge variant="outline" className={cn("h-5 px-1.5 text-[10px] font-bold uppercase border-border bg-muted/50", FEATURE_STATUS_CONFIG[feature.status].color)}>
              {FEATURE_STATUS_CONFIG[feature.status].label}
            </Badge>
          </div>

          <div className="flex justify-center">
            <FeatureWindow.HealthIcon health={feature.health} />
          </div>

          <div className="flex justify-center">
            {project && (
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-muted/50 border border-border text-[10px] text-muted-foreground font-medium whitespace-nowrap overflow-hidden">
                <span>{project.icon}</span>
                <span className="max-w-[80px] truncate">{project.name}</span>
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-muted">
                  <DotsThree className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-popover border-border backdrop-blur-md">
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation();
                  onAddMilestone(feature.id);
                }}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add milestone
                </DropdownMenuItem>
                <DropdownMenuSeparator className="border-border" />
                <DropdownMenuItem className="text-red-400 focus:bg-red-500/10 focus:text-red-400" onClick={(e) => {
                  e.stopPropagation();
                  handleDelete();
                }}>
                  <Trash className="mr-2 h-4 w-4" />
                  Delete feature
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="overflow-hidden border-l border-border ml-6 pl-4"
            >
              <div className="py-2 space-y-1">
                {feature.milestones?.map((m) => {
                  const isEditing = editingDescriptionId === m.id;
                  
                  return (
                    <div key={m.id} className="space-y-1">
                      <div className="flex items-center gap-3 py-1.5 px-2 rounded-lg hover:bg-muted/50 transition-colors group/milestone">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleMilestoneStatus(m.id);
                          }}
                          className="flex-shrink-0 transition-transform active:scale-90"
                        >
                          {m.completed ? (
                            <CheckSquare weight="fill" className="h-4 w-4 text-emerald-500" />
                          ) : (
                            <Square className="h-4 w-4 text-muted-foreground group-hover/milestone:text-muted-foreground/60 transition-colors" />
                          )}
                        </button>
                        <div className="flex-grow flex flex-col min-w-0">
                          <span 
                            className={cn(
                              "text-xs truncate",
                              m.completed ? "text-muted-foreground line-through" : "text-foreground/70"
                            )}
                          >
                            {m.name}
                          </span>
                          
                          {isEditing ? (
                            <input
                              className="text-[10px] bg-muted border-none outline-none rounded px-1 py-0.5 mt-0.5 text-foreground w-full"
                              value={tempDescription}
                              autoFocus
                              onChange={(e) => setTempDescription(e.target.value)}
                              onBlur={async () => {
                                await onUpdateMilestone(feature.id, m.id, { description: tempDescription });
                                setEditingDescriptionId(null);
                              }}
                              onKeyDown={async (e) => {
                                if (e.key === 'Enter') {
                                  await onUpdateMilestone(feature.id, m.id, { description: tempDescription });
                                  setEditingDescriptionId(null);
                                }
                              }}
                              onClick={(e) => e.stopPropagation()}
                            />
                          ) : (
                            <span 
                              className="text-[10px] text-muted-foreground/50 hover:text-muted-foreground/70 cursor-text truncate mt-0.5"
                              onClick={(e) => {
                                e.stopPropagation();
                                setTempDescription(m.description || '');
                                setEditingDescriptionId(m.id);
                              }}
                            >
                              {m.description || 'add description...'}
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-1 opacity-0 group-hover/milestone:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onCreateIssueForMilestone?.(feature.id, m.id);
                            }}
                            className="p-1 hover:bg-muted rounded transition-colors"
                            title="Create issue for this milestone"
                          >
                            <Plus className="h-3.5 w-3.5 text-primary/60" weight="bold" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm('Archive this milestone?')) {
                                onDeleteMilestone(feature.id, m.id);
                              }
                            }}
                            className="p-1 hover:bg-destructive/10 hover:text-destructive rounded transition-colors"
                            title="Delete milestone"
                          >
                            <Trash className="h-3.5 w-3.5 text-muted-foreground hover:text-inherit" />
                          </button>
                        </div>

                        {m.targetDate && (
                          <span className="text-[10px] text-muted-foreground/50 font-mono">
                            {new Date(m.targetDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
                
                {(!feature.milestones || feature.milestones.length === 0) && (
                  <div className="text-[10px] text-muted-foreground/30 italic pl-2 py-1">
                    No milestones defined
                  </div>
                )}

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddMilestone(feature.id);
                  }}
                  className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors pl-2 pt-1"
                >
                  <Plus className="h-3 w-3" />
                  Add Top Milestone
                </button>

                <div className="pt-4 mt-4 border-t border-border/20 space-y-3">
                  {feature.subFeatures && feature.subFeatures.length > 0 && (
                    <div className="space-y-1">
                      <div className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 pl-2 mb-2">Sub-features</div>
                      {feature.subFeatures.map(sub => (
                        <div 
                          key={sub.id} 
                          className="flex items-center gap-3 py-1.5 px-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group/sub"
                          onClick={(e) => {
                            e.stopPropagation();
                          }}
                        >
                          <Package className="h-3.5 w-3.5 text-primary/40" />
                          <span className="text-xs text-muted-foreground/80 group-hover/sub:text-foreground transition-colors flex-1">{sub.name}</span>
                          <Badge variant="outline" className={cn("h-4 px-1 text-[8px] font-bold uppercase border-border bg-muted/50", FEATURE_STATUS_CONFIG[sub.status].color)}>
                            {FEATURE_STATUS_CONFIG[sub.status].label}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddSubFeature?.(feature);
                    }}
                    className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors pl-2"
                  >
                    <Plus className="h-3 w-3" />
                    Create Sub-feature
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  },

    List: ({
      features,
      loading,
      projects,
      teams,
      onUpdateFeature,
      onDeleteFeature,
      onSelectFeature,
      onAddMilestone,
      onAddSubFeature,
      onToggleMilestone,
      onUpdateMilestone,
      onDeleteMilestone,
      onCreateIssueForMilestone,
      onCreateFeature 
    }: {
      features: Feature[];
      loading?: boolean;
      projects: Project[];
      teams?: Team[];
      onUpdateFeature: (id: string, updates: Partial<Feature>) => Promise<void>; 
      onDeleteFeature: (id: string) => Promise<void>; 
      onSelectFeature: (id: string) => void; 
      onAddMilestone: (featureId: string, parentId?: string) => void;
      onAddSubFeature?: (parentFeature: Feature) => void;
      onCreateIssueForMilestone?: (featureId: string, milestoneId: string) => void;
      onToggleMilestone: (featureId: string, milestoneId: string) => Promise<void>;
      onUpdateMilestone: (featureId: string, milestoneId: string, updates: Partial<FeatureMilestone>) => Promise<void>;
      onDeleteMilestone: (featureId: string, milestoneId: string) => Promise<void>;
          onCreateFeature?: () => void; 
        }) => {
          const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
          const priorityGroupRefs = useRef<Record<IssuePriority, HTMLDivElement | null>>({} as any);
          const [priorityGroupRects, setPriorityGroupRects] = useState<Record<IssuePriority, DOMRect>>({} as any);
          const [manualCollapsibleStates, setManualCollapsibleStates] = useState<Record<IssuePriority, boolean>>({} as any);
        
          const toggleExpand = (id: string) => {
            const next = new Set(expandedIds);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            setExpandedIds(next);
          };
      
          const handleDragOverPriority = (priority: IssuePriority) => {
            setManualCollapsibleStates(prev => ({ ...prev, [priority]: true }));
          };
        
          const groupedFeatures = useMemo(() => {
            const groups: Record<IssuePriority, Feature[]> = {
              urgent: [],
              high: [],
              medium: [],
              low: [],
              none: [],
            };
            
            features.forEach((f) => {
              const p = f.priority || 'none';
              if (groups[p]) groups[p].push(f);
            });
            
            return groups;
          }, [features]);
      
          const orderedPriorities = useMemo(() => {
            const fullPriorities = PRIORITY_ORDER.filter(p => groupedFeatures[p].length > 0);
            const emptyPriorities = PRIORITY_ORDER.filter(p => groupedFeatures[p].length === 0);
            return [...fullPriorities, ...emptyPriorities];
          }, [groupedFeatures]);

          const getPriorityColorClass = (priority: IssuePriority) => {
            switch (priority) {
              case 'urgent': return 'bg-red-400';
              case 'high': return 'bg-orange-400';
              case 'medium': return 'bg-yellow-400';
              case 'low': return 'bg-blue-400';
              case 'none': return 'bg-zinc-500';
              default: return 'bg-primary/40';
            }
          };
  
      if (loading) return (
        <div className="flex-1 flex items-center justify-center bg-background">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
        </div>
      );
  
      return (
        <div className="flex-1 overflow-y-auto scrollbar-none bg-background px-2">
          <div className="max-w-7xl mx-auto space-y-6 pb-20 pt-4">
            {orderedPriorities.map((priority) => {
              const priorityFeatures = groupedFeatures[priority];
              const isDefaultOpen = priorityFeatures.length > 0;
              const isOpen = manualCollapsibleStates[priority] === undefined
                ? isDefaultOpen
                : manualCollapsibleStates[priority];
              return (
                <Collapsible 
                  key={priority} 
                  open={isOpen}
                  onOpenChange={(open) => setManualCollapsibleStates(prev => ({ ...prev, [priority]: open }))}
                  className="transition-all duration-500" 
                  data-priority={priority}
                >
                  <CollapsibleTrigger className="flex items-center gap-3 px-4 py-2 mb-2 w-full group text-left">
                    <CaretDown className="h-3.5 w-3.5 transition-transform group-data-[state=closed]:-rotate-90 text-muted-foreground/50 group-hover:text-muted-foreground shrink-0" />
                    <div className="flex items-center gap-2 flex-1">
                      <FeatureWindow.PriorityIcon priority={priority} className="w-3 h-3" />
                      <span className={cn("text-[10px] font-black uppercase tracking-[0.2em]", PRIORITY_CONFIG[priority].color)}>
                        {PRIORITY_CONFIG[priority].label}
                      </span>
                    </div>
                    <span className="flex h-5 w-5 items-center justify-center rounded-md bg-muted text-[10px] font-bold text-muted-foreground/40 border border-border shrink-0">{priorityFeatures.length}</span>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="space-y-0.5 min-h-[50px] border border-dashed border-border rounded-xl p-1">
                      {priorityFeatures.map((feature) => (
                        <FeatureWindow.Row
                          key={feature.id} 
                          feature={feature} 
                          projects={projects} 
                          teams={teams}
                          allFeatures={features}
                          expanded={expandedIds.has(feature.id)}
                          onToggleExpand={() => toggleExpand(feature.id)}
                          onUpdate={onUpdateFeature} 
                          onDelete={onDeleteFeature} 
                          onClick={() => onSelectFeature(feature.id)} 
                          onToggleMilestone={onToggleMilestone}
                          onUpdateMilestone={onUpdateMilestone}
                          onDeleteMilestone={onDeleteMilestone}
                          onAddMilestone={onAddMilestone}
                          onAddSubFeature={onAddSubFeature}
                          onCreateIssueForMilestone={onCreateIssueForMilestone}
                          onDragOverPriority={handleDragOverPriority}
                        />
                      ))}
                      {priorityFeatures.length === 0 && (
                        <div className="text-[10px] text-muted-foreground/20 italic text-center py-4">Drop features here to set priority</div>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })}

            {features.length === 0 && (
              <div className="flex-1 flex flex-col items-center justify-center py-20 text-center animate-in fade-in zoom-in duration-500">
                <div className="w-16 h-16 rounded-2xl bg-muted border border-border flex items-center justify-center mb-6 shadow-2xl">
                  <Diamond className="h-8 w-8 text-muted-foreground/40" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">No features found</h3>
                <p className="text-sm text-muted-foreground mb-8 max-w-[280px] text-center">
                  Start by creating a feature to plan your engineering roadmap.
                </p>
                {onCreateFeature && (
                  <Button 
                    onClick={onCreateFeature}
                    className="h-10 px-6 gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all hover:scale-105"
                  >
                    <Plus className="h-4 w-4" />
                    Create Feature
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      );
    },

    Detail: ({ 
      featureId, 
      features, 
      projects,
      teams,
      orgMembers,
      onClose, 
      onUpdateFeature, 
      onDeleteFeature, 
      onAddMilestone,
      onCreateIssueForMilestone,
      onToggleMilestone,
      onDeleteMilestone,
      onUpdateMilestone,
      onAddFeature,
      onAddSubFeature,
    }: { 
      featureId: string | null; 
      features: Feature[]; 
      projects: Project[];
      teams?: Team[];
      orgMembers?: any[];
      onClose: () => void; 
      onUpdateFeature: (id: string, updates: Partial<Feature>) => Promise<void>; 
      onDeleteFeature: (id: string) => Promise<void>; 
      onAddMilestone: (featureId: string, parentId?: string) => void;
      onCreateIssueForMilestone?: (featureId: string, milestoneId: string) => void;
      onToggleMilestone: (featureId: string, milestoneId: string) => Promise<void>;
      onDeleteMilestone: (featureId: string, milestoneId: string) => Promise<void>;
      onUpdateMilestone?: (featureId: string, milestoneId: string, updates: any) => Promise<void>;
      onAddFeature: (data: any) => Promise<void>;
      onAddSubFeature?: (parentFeature: Feature) => void;
    }) => {
      const { toast } = useToast();
      const navigate = useNavigate();
      const [isMaximized, setIsMaximized] = useState(false);
      const [createSubFeatureOpen, setCreateSubFeatureOpen] = useState(false);
      const feature = useMemo(() => featureId ? features.find(f => f.id === featureId) : null, [features, featureId]);
      const project = useMemo(() => feature ? projects.find(p => p.id === feature.projectId) : null, [projects, feature?.projectId]);

      const getInitials = (name?: string) => {
        if (!name) return '?';
        return name.split(' ').map(n => n?.[0] || '').join('').toUpperCase().slice(0, 2);
      };

      const handleUpdateStatus = async (status: FeatureStatus) => {
        if (!feature) return;
        try {
          await onUpdateFeature(feature.id, { status });
          toast({ title: 'Status updated' });
        } catch (error: any) {
          toast({ 
            title: 'Failed to update status', 
            description: error.response?.data?.detail || 'An error occurred',
            variant: 'destructive' 
          });
        }
      };

      const handleUpdateType = async (type: FeatureType) => {
        if (!feature) return;
        try {
          await onUpdateFeature(feature.id, { type });
          toast({ title: 'Type updated' });
        } catch (error: any) {
          toast({ 
            title: 'Failed to update type', 
            description: error.response?.data?.detail || 'An error occurred',
            variant: 'destructive' 
          });
        }
      };
  
      const handleUpdateHealth = async (health: FeatureHealth) => {
        if (!feature) return;
        try {
          await onUpdateFeature(feature.id, { health });
          toast({ title: 'Health updated' });
        } catch (error: any) {
          toast({ 
            title: 'Failed to update health', 
            description: error.response?.data?.detail || 'An error occurred',
            variant: 'destructive' 
          });
        }
      };
  
      const handleUpdatePriority = async (priority: IssuePriority) => {
        if (!feature) return;
        try {
          await onUpdateFeature(feature.id, { priority });
          toast({ title: 'Priority updated' });
        } catch (error: any) {
          toast({ 
            title: 'Failed to update priority', 
            description: error.response?.data?.detail || 'An error occurred',
            variant: 'destructive' 
          });
        }
      };

      const handleUpdateOwner = async (ownerId: string | undefined) => {
        if (!feature) return;
        try {
          await onUpdateFeature(feature.id, { ownerId });
          toast({ title: 'Owner updated' });
        } catch (error: any) {
          toast({ 
            title: 'Failed to update owner', 
            description: error.response?.data?.detail || 'An error occurred',
            variant: 'destructive' 
          });
        }
      };
  
      const handleToggleMilestoneStatus = async (milestoneId: string) => {
        if (!feature) return;
        try {
          await onToggleMilestone(feature.id, milestoneId);
        } catch (error: any) {
          toast({ 
            title: 'Failed to update milestone', 
            description: error.response?.data?.detail || 'An error occurred',
            variant: 'destructive' 
          });
        }
      };
  
      if (!featureId) return null;
  
      return (
        <Dialog open={!!featureId} onOpenChange={(open) => !open && onClose()}>
          <DialogContent 
            className={cn(
              "p-0 flex flex-col bg-popover transition-all duration-500 ease-in-out gap-0 border-border overflow-hidden shadow-[0_0_100px_-12px_rgba(0,0,0,0.5)]",
              "before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.05),transparent_40%)] before:pointer-events-none",
              isMaximized 
                ? "fixed inset-0 w-screen h-screen max-w-none translate-x-0 translate-y-0 left-0 top-0 rounded-none z-[100]" 
                : "w-full sm:max-w-6xl h-[92vh] left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] rounded-[32px] border border-border"
            )}
          >
            {/* Premium Window Title Bar */}
            <div className="relative shrink-0 select-none z-20">
              <div className="absolute inset-0 bg-background/40 backdrop-blur-2xl pointer-events-none" />
              <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
              <DialogHeader className="px-6 h-12 flex-row items-center justify-between space-y-0 relative">
                <div className="flex items-center gap-6">
                  {/* Refined Window Controls */}
                  <div className="flex gap-2 px-1">
                    <button className="w-3 h-3 rounded-full bg-[#FF5F57] hover:brightness-110 transition-all border border-black/10" onClick={onClose} />
                    <button className="w-3 h-3 rounded-full bg-[#FFBD2E] hover:brightness-110 transition-all border border-black/10" onClick={() => setIsMaximized(!isMaximized)} />
                    <button className="w-3 h-3 rounded-full bg-[#28C840] hover:brightness-110 transition-all border border-black/10" />
                  </div>
                  
                  <div className="h-4 w-px bg-border" />
                  
                  {/* Breadcrumbs */}
                  <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.2em]">
                    {project && (
                      <div 
                        className="flex items-center gap-2.5 group cursor-pointer hover:bg-muted px-2 py-1 rounded-lg transition-all" 
                        onClick={() => navigate(`/projects/${project.id}`)}
                      >
                        <span className="text-muted-foreground/30 group-hover:text-muted-foreground/60 transition-colors drop-shadow-sm">{project.icon}</span>
                        <span className="text-muted-foreground/30 group-hover:text-muted-foreground transition-colors">{project.name}</span>
                        <CaretRight className="h-2.5 w-2.5 text-muted-foreground/10 group-hover:text-muted-foreground/20" />
                      </div>
                    )}
                    <div className="flex items-center gap-2.5 text-primary/80 px-3 py-1 rounded-lg bg-primary/10 border border-primary/20 shadow-lg shadow-primary/5">
                      <span className="tracking-[0.25em]">{feature?.identifier || 'FEATURE'}</span>
                    </div>
                  </div>
                  
                  <DialogTitle className="sr-only">Feature Details</DialogTitle>
                  <DialogDescription className="sr-only">
                    Strategic overview and roadmap for the {feature?.name} initiative.
                  </DialogDescription>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5 border border-border mr-2">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className={cn("h-7 w-7 rounded-md transition-all", isMaximized ? "text-primary bg-primary/10" : "text-muted-foreground/40 hover:text-foreground hover:bg-background/50")} 
                      onClick={() => setIsMaximized(!isMaximized)}
                    >
                      {isMaximized ? <CornersIn className="h-3.5 w-3.5" /> : <CornersOut className="h-3.5 w-3.5" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md text-muted-foreground/40 hover:text-destructive hover:bg-destructive/5 transition-all" onClick={onClose}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </DialogHeader>
            </div>
            
            {feature ? (
              <div className="flex-1 flex overflow-hidden">
                <ScrollArea className="flex-1 h-full bg-popover">
                  <div className="max-w-4xl mx-auto py-12 px-10 space-y-10">
                    <div className="space-y-6">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={cn("h-5 px-2.5 text-[9px] font-black uppercase tracking-widest border-border bg-muted/50", FEATURE_STATUS_CONFIG[feature.status].color)}>
                          {FEATURE_STATUS_CONFIG[feature.status].label}
                        </Badge>
                        <FeatureWindow.HealthIcon health={feature.health} className="h-2 w-2" />
                        <span className={cn("text-[9px] font-bold uppercase tracking-widest", FEATURE_HEALTH_CONFIG[feature.health].color)}>
                          {FEATURE_HEALTH_CONFIG[feature.health].label}
                        </span>
                      </div>

                      <div className="flex items-start gap-4">
                        <div className="h-14 w-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-2xl shrink-0">
                          {FEATURE_TYPE_CONFIG[feature.type || 'new_capability']?.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h2 className="text-3xl font-bold tracking-tight text-foreground leading-tight selection:bg-primary/30">
                            {feature.name}
                          </h2>
                          {feature.parentId && (
                            <div className="flex items-center gap-2 mt-2">
                              <Package className="h-3 w-3 text-muted-foreground/40" />
                              <span className="text-[10px] text-muted-foreground/60">
                                Sub-feature of <span className="text-foreground/80 font-medium">{features.find(f => f.id === feature.parentId)?.name || '...'}</span>
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {project && (
                        <div 
                          className="flex items-center gap-3 bg-muted/30 border border-border p-3 rounded-xl w-fit group hover:border-primary/20 transition-all cursor-pointer"
                          onClick={() => navigate(`/projects/${project.id}`)}
                        >
                          <div className="h-9 w-9 rounded-lg bg-muted/50 border border-border flex items-center justify-center text-lg group-hover:scale-105 transition-transform">
                            {project.icon}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-widest">Project</span>
                            <span className="text-sm font-semibold text-foreground/80">{project.name}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-3">
                      <h3 className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest">Description</h3>
                      <div className="text-sm text-foreground/70 leading-relaxed p-4 rounded-xl bg-muted/20 border border-border">
                        {feature.problemStatement || <span className="text-muted-foreground/30 italic">No description provided.</span>}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest">Sub-Features</h3>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-7 px-3 text-[9px] font-bold text-muted-foreground/60 hover:text-primary"
                          onClick={() => onAddSubFeature?.(feature)}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Add
                        </Button>
                      </div>
                      
                      {features.filter(f => f.parentId === feature.id).length > 0 ? (
                        <div className="grid grid-cols-2 gap-3">
                          {features.filter(f => f.parentId === feature.id).map(subF => (
                            <div 
                              key={subF.id}
                              className="group bg-muted/20 hover:bg-muted/40 border border-border hover:border-primary/20 p-3 rounded-lg transition-all cursor-pointer"
                              onClick={() => { onClose(); navigate(`/features/${subF.id}`); }}
                            >
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="text-[9px] font-bold text-muted-foreground/40">{subF.identifier}</span>
                                <FeatureWindow.HealthIcon health={subF.health} />
                              </div>
                              <h4 className="text-xs font-semibold text-foreground/80 group-hover:text-primary transition-colors">{subF.name}</h4>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="py-6 border border-dashed border-border rounded-lg flex items-center justify-center">
                          <span className="text-[10px] text-muted-foreground/30">No sub-features</span>
                        </div>
                      )}
                    </div>

                    <div className="border-t border-border pt-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest">Roadmap</h3>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-7 px-3 text-[9px] font-bold text-muted-foreground/60 hover:text-primary"
                          onClick={() => onAddMilestone(feature.id)}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Add Milestone
                        </Button>
                      </div>
                      
                      {feature.milestones && feature.milestones.length > 0 ? (
                        <div className="space-y-2">
                          {feature.milestones.map(m => (
                            <div key={m.id} className="flex items-center gap-3 p-3 bg-muted/20 border border-border rounded-lg group">
                              <button
                                onClick={() => handleToggleMilestoneStatus(m.id)}
                                className="flex-shrink-0"
                              >
                                {m.completed ? (
                                  <CheckSquare weight="fill" className="h-4 w-4 text-emerald-500" />
                                ) : (
                                  <Square className="h-4 w-4 text-muted-foreground/40 group-hover:text-muted-foreground/60 transition-colors" />
                                )}
                              </button>
                              <div className="flex-1 min-w-0">
                                <span className={cn("text-xs font-medium", m.completed ? "text-muted-foreground/60 line-through" : "text-foreground/80")}>
                                  {m.name}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-6 w-6 text-muted-foreground/40 hover:text-primary"
                                  onClick={() => onCreateIssueForMilestone?.(feature.id, m.id)}
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-6 w-6 text-muted-foreground/40 hover:text-destructive"
                                  onClick={() => onDeleteMilestone(feature.id, m.id)}
                                >
                                  <Trash className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="py-10 border border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-3">
                          <Target className="h-8 w-8 text-muted-foreground/20" />
                          <span className="text-[10px] text-muted-foreground/30">No milestones yet</span>
                        </div>
                      )}
                    </div>
                  </div>
                </ScrollArea>

                <aside className="w-[320px] h-full bg-muted/30 shrink-0 flex flex-col border-l border-border">
                  <ScrollArea className="flex-1">
                    <div className="p-5 space-y-6">
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-muted-foreground/40">
                          <Gear className="h-3 w-3" />
                          <h3 className="text-[9px] font-bold uppercase tracking-widest">Properties</h3>
                        </div>

                        <div className="space-y-3">
                          <div className="space-y-1.5">
                            <label className="text-[9px] font-semibold text-muted-foreground/60 uppercase tracking-wide">Type</label>
                            <Select value={feature.type || 'new_capability'} onValueChange={(v) => handleUpdateType(v as FeatureType)}>
                              <SelectTrigger className="h-9 bg-muted/50 border-border rounded-lg text-xs">
                                <SelectValue>
                                  <div className="flex items-center gap-2">
                                    <span>{FEATURE_TYPE_CONFIG[feature.type || 'new_capability']?.icon}</span>
                                    <span className="text-foreground/70">{FEATURE_TYPE_CONFIG[feature.type || 'new_capability']?.label}</span>
                                  </div>
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent className="bg-popover border-border rounded-xl">
                                {Object.entries(FEATURE_TYPE_CONFIG).map(([key, config]) => (
                                  <SelectItem key={key} value={key} className="rounded-lg">
                                    <div className="flex items-center gap-2">
                                      <span>{config.icon}</span>
                                      <span>{config.label}</span>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[9px] font-semibold text-muted-foreground/60 uppercase tracking-wide">Status</label>
                            <Select value={feature.status} onValueChange={(v) => handleUpdateStatus(v as FeatureStatus)}>
                              <SelectTrigger className="h-9 bg-muted/50 border-border rounded-lg text-xs">
                                <SelectValue>
                                  <div className="flex items-center gap-2">
                                    <FeatureWindow.StatusIcon status={feature.status} className="h-3.5 w-3.5" />
                                    <span className={cn(FEATURE_STATUS_CONFIG[feature.status].color)}>{FEATURE_STATUS_CONFIG[feature.status].label}</span>
                                  </div>
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent className="bg-popover border-border rounded-xl">
                                {Object.entries(FEATURE_STATUS_CONFIG).map(([key, config]) => (
                                  <SelectItem key={key} value={key} className="rounded-lg">
                                    <div className="flex items-center gap-2">
                                      <FeatureWindow.StatusIcon status={key as FeatureStatus} className="h-3.5 w-3.5" />
                                      <span className={cn(config.color)}>{config.label}</span>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[9px] font-semibold text-muted-foreground/60 uppercase tracking-wide">Owner</label>
                            <Select value={feature.ownerId || 'none'} onValueChange={(v) => handleUpdateOwner(v === 'none' ? undefined : v)}>
                              <SelectTrigger className="h-9 bg-muted/50 border-border rounded-lg text-xs">
                                <SelectValue>
                                  {feature.ownerId && orgMembers ? (
                                    <div className="flex items-center gap-2">
                                      <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center text-[8px] font-bold text-primary">
                                        {getInitials(orgMembers.find(m => m.id === feature.ownerId)?.full_name)}
                                      </div>
                                      <span className="text-foreground/70 truncate">{orgMembers.find(m => m.id === feature.ownerId)?.full_name}</span>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-2 text-muted-foreground/40">
                                      <User className="h-3.5 w-3.5" />
                                      <span>Unassigned</span>
                                    </div>
                                  )}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent className="bg-popover border-border rounded-xl max-h-[300px]">
                                <SelectItem value="none" className="rounded-lg text-muted-foreground/60">Unassigned</SelectItem>
                                {orgMembers?.map((member) => (
                                  <SelectItem key={member.id} value={member.id} className="rounded-lg">
                                    <div className="flex items-center gap-2">
                                      <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center text-[8px] font-bold">
                                        {member.first_name?.[0]}{member.last_name?.[0]}
                                      </div>
                                      <span>{member.full_name}</span>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1.5">
                              <label className="text-[9px] font-semibold text-muted-foreground/60 uppercase tracking-wide">Priority</label>
                              <Select value={feature.priority || 'none'} onValueChange={(v) => handleUpdatePriority(v as IssuePriority)}>
                                <SelectTrigger className="h-9 bg-muted/50 border-border rounded-lg text-xs">
                                  <SelectValue>
                                    <div className="flex items-center gap-1.5">
                                      <FeatureWindow.PriorityIcon priority={feature.priority || 'none'} className="h-3 w-3" />
                                      <span className={cn("text-[10px]", PRIORITY_CONFIG[feature.priority || 'none'].color)}>
                                        {PRIORITY_CONFIG[feature.priority || 'none'].label}
                                      </span>
                                    </div>
                                  </SelectValue>
                                </SelectTrigger>
                                <SelectContent className="bg-popover border-border rounded-xl">
                                  {Object.entries(PRIORITY_CONFIG).map(([p, config]) => (
                                    <SelectItem key={p} value={p} className="rounded-lg">
                                      <div className="flex items-center gap-2">
                                        <FeatureWindow.PriorityIcon priority={p as any} className="h-3 w-3" />
                                        <span className={cn(config.color)}>{config.label}</span>
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-[9px] font-semibold text-muted-foreground/60 uppercase tracking-wide">Health</label>
                              <Select value={feature.health} onValueChange={(v) => handleUpdateHealth(v as FeatureHealth)}>
                                <SelectTrigger className="h-9 bg-muted/50 border-border rounded-lg text-xs">
                                  <SelectValue>
                                    <div className="flex items-center gap-1.5">
                                      <FeatureWindow.HealthIcon health={feature.health} className="h-2 w-2" />
                                      <span className={cn("text-[10px]", FEATURE_HEALTH_CONFIG[feature.health].color)}>
                                        {FEATURE_HEALTH_CONFIG[feature.health].label}
                                      </span>
                                    </div>
                                  </SelectValue>
                                </SelectTrigger>
                                <SelectContent className="bg-popover border-border rounded-xl">
                                  {Object.entries(FEATURE_HEALTH_CONFIG).map(([h, config]) => (
                                    <SelectItem key={h} value={h} className="rounded-lg">
                                      <div className="flex items-center gap-2">
                                        <FeatureWindow.HealthIcon health={h as FeatureHealth} className="h-2 w-2" />
                                        <span className={cn(config.color)}>{config.label}</span>
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-border">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => onAddSubFeature?.(feature)}
                          className="w-full h-9 gap-2 text-[10px] font-bold border-dashed border-border hover:border-primary/30 hover:text-primary rounded-lg"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Create Sub-feature
                        </Button>
                      </div>

                      <div className="pt-4 border-t border-border">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="w-full h-9 text-destructive/70 hover:text-destructive hover:bg-destructive/5 text-[10px] font-bold rounded-lg"
                          onClick={async () => {
                            if (confirm('Delete this feature? This action cannot be undone.')) {
                              try {
                                await onDeleteFeature(feature.id);
                                toast({ title: 'Feature Deleted' });
                                onClose();
                              } catch (error: any) {
                                toast({ 
                                  title: 'Delete Failed', 
                                  description: error.response?.data?.detail || 'System error',
                                  variant: 'destructive' 
                                });
                              }
                            }
                          }}
                        >
                          <Trash className="h-3.5 w-3.5 mr-1.5" />
                          Delete Feature
                        </Button>
                      </div>
                    </div>
                  </ScrollArea>
                </aside>
              </div>
            ) : (
               <div className="flex-1 flex flex-col items-center justify-center p-20 space-y-6 animate-pulse">
                 <div className="h-20 w-20 rounded-[32px] bg-muted border border-border flex items-center justify-center">
                   <WarningCircle className="h-10 w-10 text-muted-foreground/20" />
                 </div>
                 <span className="text-sm font-black uppercase tracking-[0.4em] text-muted-foreground/20">Synchronizing Initiative Data...</span>
               </div>
            )}
          </DialogContent>
          {feature && (
            <CreateSubFeatureDialog
              open={createSubFeatureOpen}
              onOpenChange={setCreateSubFeatureOpen}
              parentFeature={feature}
              onAddFeature={async (data) => {
                await onAddFeature(data);
                setCreateSubFeatureOpen(false);
                toast({ title: 'Sub-feature created' });
              }}
            />
          )}
        </Dialog>
      );
    }
};
