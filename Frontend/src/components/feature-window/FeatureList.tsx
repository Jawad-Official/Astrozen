import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { Feature, FeatureMilestone } from '@/types/feature';
import { Project, IssuePriority, PRIORITY_CONFIG } from '@/types/issue';
import { Team } from '@/types/auth';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { CaretDown, Diamond, Plus } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { PRIORITY_ORDER } from './constants';
import { PriorityIcon } from './PriorityIcon';
import { FeatureRow } from './FeatureRow';

export const FeatureList = ({
  features,
  loading,
  projects,
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
                  <PriorityIcon priority={priority} className="w-3 h-3" />
                  <span className={cn("text-[10px] font-black uppercase tracking-[0.2em]", PRIORITY_CONFIG[priority].color)}>
                    {PRIORITY_CONFIG[priority].label}
                  </span>
                </div>
                <span className="flex h-5 w-5 items-center justify-center rounded-md bg-muted text-[10px] font-bold text-muted-foreground/40 border border-border shrink-0">{priorityFeatures.length}</span>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="space-y-0.5 min-h-[50px] border border-dashed border-border rounded-xl p-1">
                  {priorityFeatures.map((feature) => (
                    <FeatureRow
                      key={feature.id}
                      feature={feature}
                      projects={projects}
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
};
