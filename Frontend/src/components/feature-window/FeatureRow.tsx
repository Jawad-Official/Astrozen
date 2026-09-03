import { useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { Feature, FeatureMilestone } from '@/types/feature';
import { Project, IssuePriority, PRIORITY_CONFIG } from '@/types/issue';
import {
  Square,
  CheckSquare,
  DotsThree,
  Trash,
  Plus,
  CaretDown,
  CaretRight,
} from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { Package } from '@phosphor-icons/react';
import { FEATURE_STATUS_CONFIG } from './constants';
import { PriorityIcon } from './PriorityIcon';
import { HealthIcon } from './HealthIcon';

export const FeatureRow = ({
  feature,
  projects,
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
  const lastDraggedPriority = useRef<IssuePriority | null>(null);
  const [editingDescriptionId, setEditingDescriptionId] = useState<string | null>(null);
  const [tempDescription, setTempDescription] = useState('');

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
                <PriorityIcon priority={feature.priority || 'none'} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="bg-popover border-border backdrop-blur-md">
              {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                <DropdownMenuItem key={key} onClick={(e) => {
                  e.stopPropagation();
                  onUpdate(feature.id, { priority: key as any });
                }} className="focus:bg-muted">
                  <div className="flex items-center gap-2">
                    <PriorityIcon priority={key} />
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
          <HealthIcon health={feature.health} />
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
};
