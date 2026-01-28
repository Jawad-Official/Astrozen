import { useMemo, useState, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Feature, FeatureStatus, FeatureHealth, FeatureMilestone } from '@/types/feature';
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

export const FEATURE_STATUS_CONFIG: Record<FeatureStatus, { label: string; color: string }> = {
  discovery: { label: 'Discovery', color: 'text-purple-400' },
  validated: { label: 'Validated', color: 'text-blue-400' },
  in_build: { label: 'In Build', color: 'text-yellow-400' },
  in_review: { label: 'In Review', color: 'text-orange-400' },
  shipped: { label: 'Shipped', color: 'text-emerald-400' },
  adopted: { label: 'Adopted', color: 'text-indigo-400' },
  killed: { label: 'Killed', color: 'text-red-400' },
};

export const FEATURE_HEALTH_CONFIG: Record<FeatureHealth, { label: string; color: string }> = {
  on_track: { label: 'On Track', color: 'text-emerald-400' },
  at_risk: { label: 'At Risk', color: 'text-yellow-400' },
  off_track: { label: 'Off Track', color: 'text-red-400' },
};

const PRIORITY_ORDER: IssuePriority[] = ['urgent', 'high', 'medium', 'low', 'none'];

export const FeatureBar = {
  PriorityIcon: ({ priority, className }: { priority: string; className?: string }) => {
    const bars = priority === 'urgent' ? 4 : priority === 'high' ? 3 : priority === 'medium' ? 2 : priority === 'low' ? 1 : 0;
    const config = PRIORITY_CONFIG[priority as IssuePriority];
    return (
      <div className={cn('flex items-end gap-0.5 h-4 w-4', config?.color, className)}>
        {[1, 2, 3, 4].map((level) => (
          <div key={level} className={cn('w-[3px] transition-colors rounded-full', level <= bars ? 'bg-current' : 'bg-white/20', level === 1 && 'h-1', level === 2 && 'h-2', level === 3 && 'h-3', level === 4 && 'h-4')} />
        ))}
      </div>
    );
  },

  StatusIcon: ({ status, className }: { status: FeatureStatus; className?: string }) => {
    const iconClass = cn('h-4 w-4', className);
    switch (status) {
      case 'discovery': return <Binoculars className={cn(iconClass, 'text-purple-400')} />;
      case 'validated': return <CheckCircle className={cn(iconClass, 'text-blue-400')} />;
      case 'in_build': return <Gear className={cn(iconClass, 'text-yellow-400')} />;
      case 'in_review': return <CircleHalf className={cn(iconClass, 'text-orange-400')} />;
      case 'shipped': return <Archive className={cn(iconClass, 'text-emerald-400')} />;
      case 'adopted': return <Star className={cn(iconClass, 'text-indigo-400')} />;
      case 'killed': return <XCircle className={cn(iconClass, 'text-red-400')} />;
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
    expanded,
    onToggleExpand,
    onUpdate, 
    onDelete, 
    onClick,
    onToggleMilestone,
    onUpdateMilestone,
    onDeleteMilestone,
    onAddMilestone,
    onCreateIssueForMilestone,
    onDragOverPriority
  }: { 
    feature: Feature; 
    projects: Project[]; 
    teams?: Team[];
    expanded: boolean;
    onToggleExpand: () => void;
    onUpdate: (id: string, updates: Partial<Feature>) => Promise<void>; 
    onDelete: (id: string) => Promise<void>; 
    onClick?: () => void;
    onToggleMilestone: (featureId: string, milestoneId: string) => Promise<void>;
    onUpdateMilestone: (featureId: string, milestoneId: string, updates: Partial<FeatureMilestone>) => Promise<void>;
    onDeleteMilestone: (featureId: string, milestoneId: string) => Promise<void>;
    onAddMilestone: (featureId: string, parentId?: string) => void;
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
            'group relative grid grid-cols-[60px_32px_32px_1fr_100px_40px_140px_32px] items-center gap-2 px-4 py-2 cursor-grab active:cursor-grabbing transition-all duration-300 border-b border-white/[0.02] last:border-none bg-white/[0.03] hover:bg-white/5 first:rounded-t-xl last:rounded-b-xl hover:z-10 hover:scale-[1.01] select-none tracking-tight'
          )} 
          onClick={onClick}
        >
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-gradient-to-r from-primary/5 to-transparent pointer-events-none transition-opacity duration-500 rounded-xl" />
          
          <div className="flex justify-center">
            {feature.identifier && (
              <span className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-wider bg-white/[0.02] px-1.5 py-0.5 rounded border border-white/[0.05]">
                {feature.identifier}
              </span>
            )}
          </div>

          <div className="flex justify-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <button className="relative z-20 hover:bg-white/5 p-1 rounded transition-colors">
                  <FeatureBar.PriorityIcon priority={feature.priority || 'none'} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="bg-zinc-900 border-white/10 backdrop-blur-md">
                {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                  <DropdownMenuItem key={key} onClick={(e) => {
                    e.stopPropagation();
                    onUpdate(feature.id, { priority: key as any });
                  }} className="focus:bg-white/5">
                    <div className="flex items-center gap-2">
                      <FeatureBar.PriorityIcon priority={key} />
                      <span className={cn("text-[10px] font-bold uppercase", config.color)}>{config.label}</span>
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <button 
            className="relative z-20 hover:bg-white/10 p-1 rounded-md transition-colors w-fit"
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

          <span className="truncate text-sm font-medium tracking-tight text-foreground/90 group-hover:text-foreground transition-colors">
            {feature.name}
          </span>

          <div className="flex justify-center">
            <Badge variant="outline" className={cn("h-5 px-1.5 text-[10px] font-bold uppercase border-white/5 bg-white/5", FEATURE_STATUS_CONFIG[feature.status].color)}>
              {FEATURE_STATUS_CONFIG[feature.status].label}
            </Badge>
          </div>

          <div className="flex justify-center">
            <FeatureBar.HealthIcon health={feature.health} />
          </div>

          <div className="flex justify-center">
            {project && (
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/5 border border-white/5 text-[10px] text-muted-foreground font-medium whitespace-nowrap overflow-hidden">
                <span>{project.icon}</span>
                <span className="max-w-[80px] truncate">{project.name}</span>
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/10">
                  <DotsThree className="h-4 w-4 text-white/50 hover:text-white" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-zinc-900 border-white/10 backdrop-blur-md">
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation();
                  onAddMilestone(feature.id);
                }}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add milestone
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-white/5" />
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
              className="overflow-hidden border-l border-white/5 ml-6 pl-4"
            >
              <div className="py-2 space-y-1">
                {feature.milestones?.map((m) => {
                  const isEditing = editingDescriptionId === m.id;
                  
                  return (
                    <div key={m.id} className="space-y-1">
                      <div className="flex items-center gap-3 py-1.5 px-2 rounded-lg hover:bg-white/5 transition-colors group/milestone">
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
                            <Square className="h-4 w-4 text-muted-foreground group-hover/milestone:text-white/40 transition-colors" />
                          )}
                        </button>
                        <div className="flex-grow flex flex-col min-w-0">
                          <span 
                            className={cn(
                              "text-xs truncate",
                              m.completed ? "text-muted-foreground line-through" : "text-white/70"
                            )}
                          >
                            {m.name}
                          </span>
                          
                          {isEditing ? (
                            <input
                              className="text-[10px] bg-white/10 border-none outline-none rounded px-1 py-0.5 mt-0.5 text-white w-full"
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
                              className="text-[10px] text-muted-foreground/50 hover:text-white/40 cursor-text truncate mt-0.5"
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
                            className="p-1 hover:bg-white/10 rounded transition-colors"
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
                            className="p-1 hover:bg-red-500/20 hover:text-red-400 rounded transition-colors"
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
                  className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-white transition-colors pl-2 pt-1"
                >
                  <Plus className="h-3 w-3" />
                  Add Top Milestone
                </button>
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
      onUpdateFeature: (id: string, updates: Partial<Feature>) => void; 
      onDeleteFeature: (id: string) => void; 
      onSelectFeature: (id: string) => void; 
      onAddMilestone: (featureId: string, parentId?: string) => void;
      onCreateIssueForMilestone?: (featureId: string, milestoneId: string) => void;
      onToggleMilestone: (featureId: string, milestoneId: string) => void;
      onUpdateMilestone: (featureId: string, milestoneId: string, updates: Partial<FeatureMilestone>) => Promise<void>;
      onDeleteMilestone: (featureId: string, milestoneId: string) => Promise<void>;
          onCreateFeature?: () => void; 
        }) => {
          const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
          const priorityGroupRefs = useRef<Record<IssuePriority, HTMLDivElement | null>>({});
          const [priorityGroupRects, setPriorityGroupRects] = useState<Record<IssuePriority, DOMRect>>({});
          const [manualCollapsibleStates, setManualCollapsibleStates] = useState<Record<IssuePriority, boolean>>({});
        
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
        <div className="flex-1 flex items-center justify-center bg-[#090909]">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
        </div>
      );
  
      return (
        <div className="flex-1 overflow-y-auto scrollbar-none bg-[#090909] px-2">
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
                      <FeatureBar.PriorityIcon priority={priority} />
                      <span className={cn("text-[10px] font-black uppercase tracking-[0.2em]", PRIORITY_CONFIG[priority].color)}>
                        {PRIORITY_CONFIG[priority].label}
                      </span>
                    </div>
                    <span className="flex h-5 w-5 items-center justify-center rounded-md bg-white/5 text-[10px] font-bold text-white/30 border border-white/5 shrink-0">{priorityFeatures.length}</span>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="space-y-0.5 min-h-[50px] border border-dashed border-white/[0.02] rounded-xl p-1">
                      {priorityFeatures.map((feature) => (
                        <FeatureBar.Row 
                          key={feature.id} 
                          feature={feature} 
                          projects={projects} 
                          teams={teams}
                          expanded={expandedIds.has(feature.id)}
                          onToggleExpand={() => toggleExpand(feature.id)}
                          onUpdate={onUpdateFeature} 
                          onDelete={onDeleteFeature} 
                          onClick={() => onSelectFeature(feature.id)} 
                          onToggleMilestone={onToggleMilestone}
                          onUpdateMilestone={onUpdateMilestone}
                          onDeleteMilestone={onDeleteMilestone}
                          onAddMilestone={onAddMilestone}
                          onCreateIssueForMilestone={onCreateIssueForMilestone}
                          onDragOverPriority={handleDragOverPriority}
                        />
                      ))}
                      {priorityFeatures.length === 0 && (
                        <div className="text-[10px] text-white/5 italic text-center py-4">Drop features here to set priority</div>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })}

            {features.length === 0 && (
              <div className="flex-1 flex flex-col items-center justify-center py-20 text-center animate-in fade-in zoom-in duration-500">
                <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-center mb-6 shadow-2xl">
                  <Diamond className="h-8 w-8 text-white/20" />
                </div>
                <h3 className="text-xl font-semibold text-white/90 mb-2">No features found</h3>
                <p className="text-sm text-white/40 mb-8 max-w-[280px] text-center">
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
      onClose, 
      onUpdateFeature, 
      onDeleteFeature, 
      onAddMilestone,
      onCreateIssueForMilestone,
      onToggleMilestone,
      onDeleteMilestone,
    }: { 
      featureId: string | null; 
      features: Feature[]; 
      projects: Project[];
      teams?: Team[];
      onClose: () => void; 
      onUpdateFeature: (id: string, updates: Partial<Feature>) => Promise<void>; 
      onDeleteFeature: (id: string) => Promise<void>; 
      onAddMilestone: (featureId: string, parentId?: string) => void;
      onCreateIssueForMilestone?: (featureId: string, milestoneId: string) => void;
      onToggleMilestone: (featureId: string, milestoneId: string) => Promise<void>;
      onDeleteMilestone: (featureId: string, milestoneId: string) => Promise<void>;
    }) => {
      const { toast } = useToast();
      const navigate = useNavigate();
      const [isMaximized, setIsMaximized] = useState(false);
      const feature = useMemo(() => featureId ? features.find(f => f.id === featureId) : null, [features, featureId]);
      const project = useMemo(() => feature ? projects.find(p => p.id === feature.projectId) : null, [projects, feature?.projectId]);
  
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
              "p-0 flex flex-col bg-[#080809] transition-all duration-500 ease-in-out gap-0 border-white/10 overflow-hidden shadow-[0_0_100px_-12px_rgba(0,0,0,1)]",
              isMaximized 
                ? "fixed inset-0 w-screen h-screen max-w-none translate-x-0 translate-y-0 left-0 top-0 rounded-none z-[100]" 
                : "w-full sm:max-w-6xl h-[92vh] left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] rounded-2xl border border-white/10"
            )}
          >
            {/* Premium Window Title Bar */}
            <div className="relative shrink-0 select-none z-20">
              <div className="absolute inset-0 bg-[#0C0C0D]/80 backdrop-blur-xl pointer-events-none" />
              <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/5 to-transparent" />
              <DialogHeader className="px-6 h-12 flex-row items-center justify-between space-y-0 relative">
                <div className="flex items-center gap-6">
                  {/* Refined Window Controls */}
                  <div className="flex gap-2 px-1">
                    <button className="w-3 h-3 rounded-full bg-[#FF5F57] hover:brightness-110 transition-all border border-black/10" onClick={onClose} />
                    <button className="w-3 h-3 rounded-full bg-[#FFBD2E] hover:brightness-110 transition-all border border-black/10" onClick={() => setIsMaximized(!isMaximized)} />
                    <button className="w-3 h-3 rounded-full bg-[#28C840] hover:brightness-110 transition-all border border-black/10" />
                  </div>
                  
                  <div className="h-4 w-px bg-white/5" />
                  
                  {/* Breadcrumbs */}
                  <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.15em]">
                    {project && (
                      <div className="flex items-center gap-2 group cursor-pointer" onClick={() => navigate(`/projects/${project.id}`)}>
                        <span className="text-white/20 group-hover:text-white/40 transition-colors">{project.icon}</span>
                        <span className="text-white/20 group-hover:text-white/40 transition-colors">{project.name}</span>
                        <CaretRight className="h-2.5 w-2.5 text-white/10" />
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-primary/60 px-2 py-0.5 rounded bg-primary/5 border border-primary/10">
                      <span className="font-black tracking-widest">{feature?.identifier || 'FEATURE'}</span>
                    </div>
                  </div>
                  
                  <DialogTitle className="sr-only">Feature Details</DialogTitle>
                  <DialogDescription className="sr-only">
                    Strategic overview and roadmap for the {feature?.name} initiative.
                  </DialogDescription>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 bg-white/5 rounded-lg p-0.5 border border-white/5 mr-2">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className={cn("h-7 w-7 rounded-md transition-all", isMaximized ? "text-primary bg-primary/10" : "text-white/20 hover:text-white hover:bg-white/5")} 
                      onClick={() => setIsMaximized(!isMaximized)}
                    >
                      {isMaximized ? <CornersIn className="h-3.5 w-3.5" /> : <CornersOut className="h-3.5 w-3.5" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md text-white/20 hover:text-red-400 hover:bg-red-400/5 transition-all" onClick={onClose}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </DialogHeader>
            </div>
            
            {feature ? (
              <div className="flex-1 flex overflow-hidden">
                {/* Main Content Page */}
                <ScrollArea className="flex-1 h-full bg-[#080809]">
                  <div className="max-w-4xl mx-auto py-16 px-12 space-y-12">
                    {/* Page Header Area */}
                    <div className="space-y-8">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className={cn("h-6 px-3 text-[10px] font-black uppercase tracking-widest border-white/5 bg-white/5", FEATURE_STATUS_CONFIG[feature.status].color)}>
                          {FEATURE_STATUS_CONFIG[feature.status].label}
                        </Badge>
                        <div className="h-1 w-1 rounded-full bg-white/10" />
                        <FeatureBar.HealthIcon health={feature.health} className="h-2 w-2" />
                        <span className={cn("text-[10px] font-black uppercase tracking-widest", FEATURE_HEALTH_CONFIG[feature.health].color)}>
                          {FEATURE_HEALTH_CONFIG[feature.health].label}
                        </span>
                      </div>

                      <h2 className="text-6xl font-bold tracking-tighter text-white leading-[1.1] selection:bg-primary/30">
                        {feature.name}
                      </h2>

                      {project && (
                        <div 
                          className="flex items-center gap-4 bg-white/[0.02] border border-white/5 p-4 rounded-3xl w-fit group hover:border-primary/20 transition-all cursor-pointer shadow-2xl"
                          onClick={() => navigate(`/projects/${project.id}`)}
                        >
                          <div className="h-10 w-10 rounded-2xl bg-white/5 flex items-center justify-center text-2xl shadow-inner group-hover:scale-110 transition-transform">
                            {project.icon}
                          </div>
                          <div className="flex flex-col pr-4">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20">Mission Control</span>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-white/60 tracking-tight">{project.name}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Problem Statement Area */}
                    <div className="space-y-6">
                      <div className="flex items-center gap-3 text-primary/40">
                        <div className="h-px w-6 bg-current opacity-20" />
                        <h3 className="text-[10px] font-black uppercase tracking-[0.4em]">Problem Statement</h3>
                      </div>
                      
                      <div className="relative text-xl text-white/60 leading-relaxed font-medium tracking-tight bg-white/[0.01] p-10 rounded-[40px] border border-white/5 shadow-inner group/statement">
                        {feature.problemStatement || 'No primary problem statement defined for this initiative.'}
                        <Button variant="ghost" size="icon" className="absolute right-6 top-6 h-10 w-10 rounded-full bg-[#0C0C0D] border border-white/10 text-primary opacity-0 group-hover/statement:opacity-100 transition-all shadow-2xl">
                          <NotePencil className="h-5 w-5" />
                        </Button>
                      </div>
                    </div>

                    <div className="relative py-8">
                      <div className="absolute inset-0 flex items-center" aria-hidden="true">
                        <div className="w-full border-t border-white/5" />
                      </div>
                      <div className="relative flex justify-center">
                        <span className="bg-[#080809] px-4 text-[9px] font-black uppercase tracking-[0.5em] text-white/10">Strategic Execution</span>
                      </div>
                    </div>

                    {/* Strategic Roadmap */}
                    <div className="space-y-8 pb-32">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 text-primary/40">
                          <div className="h-px w-6 bg-current opacity-20" />
                          <h3 className="text-[10px] font-black uppercase tracking-[0.4em]">Milestones & Trajectory</h3>
                        </div>
                        <Button 
                          onClick={() => onAddMilestone(feature.id)}
                          className="h-9 px-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all text-[10px] font-black uppercase tracking-widest shadow-xl shadow-black/50"
                        >
                          <Plus className="mr-2 h-3.5 w-3.5" />
                          Expand Roadmap
                        </Button>
                      </div>
                      
                      {feature.milestones && feature.milestones.length > 0 ? (
                        <div className="rounded-[32px] border border-white/5 bg-[#0C0C0D] overflow-hidden shadow-2xl p-2">
                          {(() => {
                            const mapMilestonesToTasks = (ms: FeatureMilestone[]): Task[] => {
                              return ms.map(m => ({
                                id: m.id,
                                title: m.name,
                                description: m.description || '',
                                status: m.completed ? 'completed' : 'pending',
                                priority: 'medium',
                                level: 0,
                                dependencies: [],
                                subtasks: [] as any[]
                              }));
                            };
                            return (
                              <AgentPlan 
                                tasks={mapMilestonesToTasks(feature.milestones)}
                                onToggleStatus={(taskId) => handleToggleMilestoneStatus(taskId)}
                                onCreateIssue={(milestoneId) => onCreateIssueForMilestone?.(feature.id, milestoneId)}
                                onDeleteTask={(milestoneId) => onDeleteMilestone(feature.id, milestoneId)}
                              />
                            );
                          })()}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-20 bg-white/[0.01] border border-dashed border-white/5 rounded-[40px] space-y-6">
                          <div className="h-16 w-16 rounded-3xl bg-white/5 flex items-center justify-center text-white/10 shadow-inner">
                            <Target className="h-8 w-8" />
                          </div>
                          <div className="text-center space-y-2">
                            <span className="block text-sm font-black text-white/20 uppercase tracking-[0.3em]">No Milestones Defined</span>
                            <p className="text-xs text-white/10 font-bold max-w-xs">Map out the strategic delivery path for this feature to track development progress.</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </ScrollArea>

                {/* High-Fidelity Properties Sidebar */}
                <aside className="w-[380px] h-full bg-[#0C0C0D] shrink-0 flex flex-col border-l border-white/5 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
                  <ScrollArea className="flex-1">
                    <div className="p-8 space-y-12">
                      {/* Lifecycle Control */}
                      <div className="space-y-8">
                        <div className="flex items-center gap-3 text-white/10 ml-1">
                          <div className="h-4 w-4 rounded bg-primary/20 flex items-center justify-center">
                            <Gear className="h-2.5 w-2.5 text-primary" />
                          </div>
                          <h3 className="text-[10px] font-black uppercase tracking-[0.4em]">Development</h3>
                        </div>

                        <div className="space-y-6 bg-white/[0.02] p-6 rounded-[32px] border border-white/5 shadow-inner">
                          <div className="space-y-3">
                            <label className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em] ml-1">Phase</label>
                            <Select value={feature.status} onValueChange={(v) => handleUpdateStatus(v as FeatureStatus)}>
                              <SelectTrigger className="h-12 bg-white/[0.03] border-white/5 rounded-2xl hover:bg-white/10 transition-all font-bold px-5">
                                <SelectValue>
                                  <Badge variant="outline" className={cn("h-6 p-0 border-none bg-transparent uppercase tracking-widest text-[10px] font-black", FEATURE_STATUS_CONFIG[feature.status].color)}>
                                    {FEATURE_STATUS_CONFIG[feature.status].label}
                                  </Badge>
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent className="bg-[#0C0C0D] border-white/10 shadow-2xl rounded-[24px] p-2">
                                {Object.entries(FEATURE_STATUS_CONFIG).map(([s, config]) => (
                                  <SelectItem key={s} value={s} className="rounded-xl focus:bg-primary/10 focus:text-primary m-1 px-4 py-3 cursor-pointer">
                                    <span className={cn("text-[10px] font-black uppercase tracking-[0.2em]", config.color)}>{config.label}</span>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-3">
                            <label className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em] ml-1">Health</label>
                            <Select value={feature.health} onValueChange={(v) => handleUpdateHealth(v as FeatureHealth)}>
                              <SelectTrigger className="h-12 bg-white/[0.03] border-white/5 rounded-2xl hover:bg-white/10 transition-all font-bold px-5">
                                <SelectValue>
                                  <div className="flex items-center gap-3">
                                    <FeatureBar.HealthIcon health={feature.health} />
                                    <span className={cn("text-[10px] font-black uppercase tracking-widest", FEATURE_HEALTH_CONFIG[feature.health].color)}>
                                      {FEATURE_HEALTH_CONFIG[feature.health].label}
                                    </span>
                                  </div>
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent className="bg-[#0C0C0D] border-white/10 shadow-2xl rounded-[24px] p-2">
                                {Object.entries(FEATURE_HEALTH_CONFIG).map(([h, config]) => (
                                  <SelectItem key={h} value={h} className="rounded-xl focus:bg-white/5 m-1 px-4 py-3 cursor-pointer">
                                    <div className="flex items-center gap-3">
                                      <FeatureBar.HealthIcon health={h as FeatureHealth} />
                                      <span className={cn("text-[10px] font-black uppercase tracking-[0.2em]", config.color)}>{config.label}</span>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>

                      {/* Strategic Parameters */}
                      <div className="space-y-8">
                        <div className="flex items-center gap-3 text-white/10 ml-1">
                          <div className="h-4 w-4 rounded bg-orange-500/20 flex items-center justify-center">
                            <Sliders className="h-2.5 w-2.5 text-orange-500" />
                          </div>
                          <h3 className="text-[10px] font-black uppercase tracking-[0.4em]">Parameters</h3>
                        </div>

                        <div className="bg-white/[0.02] p-6 rounded-[32px] border border-white/5 space-y-6">
                          <div className="space-y-3">
                            <label className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em] ml-1">Priority</label>
                            <Select value={feature.priority || 'none'} onValueChange={(v) => handleUpdatePriority(v as IssuePriority)}>
                              <SelectTrigger className="h-12 bg-white/[0.03] border-white/5 rounded-2xl hover:bg-white/10 transition-all font-bold px-5">
                                <SelectValue>
                                  <div className="flex items-center gap-3">
                                    <FeatureBar.PriorityIcon priority={feature.priority || 'none'} />
                                    <span className={cn("text-[10px] font-black uppercase tracking-widest", PRIORITY_CONFIG[feature.priority || 'none'].color)}>
                                      {PRIORITY_CONFIG[feature.priority || 'none'].label}
                                    </span>
                                  </div>
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent className="bg-[#0C0C0D] border-white/10 shadow-2xl rounded-[24px] p-2">
                                {Object.entries(PRIORITY_CONFIG).map(([p, config]) => (
                                  <SelectItem key={p} value={p} className="rounded-xl m-1 focus:bg-white/5 cursor-pointer py-3 px-4">
                                    <div className="flex items-center gap-3">
                                      <FeatureBar.PriorityIcon priority={p as any} />
                                      <span className={cn("text-[10px] font-black uppercase tracking-widest", config.color)}>{config.label}</span>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>

                      {/* Initiative Actions */}
                      <div className="pt-12 space-y-6 px-2">
                        <Button 
                          onClick={() => navigate(`/features/${feature.id}`)}
                          className="w-full h-14 bg-white/5 border border-white/10 hover:bg-white/10 transition-all rounded-[24px] text-[10px] font-black uppercase tracking-[0.3em] shadow-xl"
                        >
                          Launch Initiative Page
                        </Button>
                        
                        <div className="pt-6 border-t border-white/5">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="w-full h-12 text-red-500/30 hover:text-red-500 hover:bg-red-500/5 text-[9px] font-black uppercase tracking-[0.4em] rounded-[24px] transition-all border border-transparent hover:border-red-500/10"
                            onClick={async () => {
                              if (confirm('Decommission this initiative? This action will archive all associated strategic data.')) {
                                try {
                                  await onDeleteFeature(feature.id);
                                  toast({ title: 'Initiative archived' });
                                  onClose();
                                } catch (error: any) {
                                  toast({ 
                                    title: 'Archival failed', 
                                    description: error.response?.data?.detail || 'System error',
                                    variant: 'destructive' 
                                  });
                                }
                              }
                            }}
                          >
                            <Trash className="h-4 w-4 mr-3" />
                            Decommission Feature
                          </Button>
                        </div>
                      </div>
                    </div>
                  </ScrollArea>
                </aside>
              </div>
            ) : (
               <div className="flex-1 flex flex-col items-center justify-center p-20 space-y-6 animate-pulse">
                 <div className="h-20 w-20 rounded-[32px] bg-white/5 border border-white/5 flex items-center justify-center">
                   <WarningCircle className="h-10 w-10 text-white/10" />
                 </div>
                 <span className="text-sm font-black uppercase tracking-[0.4em] text-white/10">Synchronizing Initiative Data...</span>
               </div>
            )}
          </DialogContent>
        </Dialog>
      );
    }
};
