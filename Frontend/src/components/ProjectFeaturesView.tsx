import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { Feature, FeatureStatus, FeatureMilestone } from '@/types/feature';
import { Project } from '@/types/issue';
import { 
  Plus, 
  DotsThree, 
  Trash, 
  Pencil, 
  CheckSquare, 
  Square,
  CaretDown,
  CaretRight,
  CalendarBlank
} from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { FEATURE_STATUS_CONFIG } from './FeatureBar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';

interface ProjectFeaturesViewProps {
  features: Feature[];
  projects: Project[];
  onUpdateFeature: (id: string, updates: Partial<Feature>) => void;
  onDeleteFeature: (id: string) => void;
  onAddMilestone: (featureId: string, parentId?: string) => void;
  onUpdateMilestone: (featureId: string, milestoneId: string, updates: any) => void;
  onDeleteMilestone: (featureId: string, milestoneId: string) => void;
  onToggleMilestone: (featureId: string, milestoneId: string) => void;
}

export const ProjectFeaturesView = ({
  features,
  projects,
  onUpdateFeature,
  onDeleteFeature,
  onAddMilestone,
  onUpdateMilestone,
  onDeleteMilestone,
  onToggleMilestone,
}: ProjectFeaturesViewProps) => {
  const { toast } = useToast();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [editingMilestoneId, setEditingMilestoneId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const toggleExpand = (id: string) => {
    const next = new Set(expandedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedIds(next);
  };

  const sortedFeatures = useMemo(() => {
    return [...features].sort((a, b) => a.name.localeCompare(b.name));
  }, [features]);

  const handleEditMilestone = (milestone: FeatureMilestone) => {
    setEditingMilestoneId(milestone.id);
    setEditName(milestone.name);
  };

  const handleSaveMilestone = async (featureId: string, milestoneId: string) => {
    if (!editName.trim()) return;
    try {
      await onUpdateMilestone(featureId, milestoneId, { name: editName.trim() });
      setEditingMilestoneId(null);
      toast({ title: 'Milestone updated' });
    } catch (error) {
      toast({ title: 'Failed to update milestone', variant: 'destructive' });
    }
  };

  const MilestoneRow = ({ m, featureId, depth = 0 }: { m: FeatureMilestone, featureId: string, depth?: number }) => (
    <div key={m.id} className="group/milestone">
      <div className={cn(
        "flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-white/5 transition-colors",
        depth > 0 && "ml-6 border-l border-white/5"
      )}>
        <button
          onClick={() => onToggleMilestone(featureId, m.id)}
          className="flex-shrink-0 transition-transform active:scale-90"
        >
          {m.completed ? (
            <CheckSquare weight="fill" className="h-4 w-4 text-emerald-500" />
          ) : (
            <Square className="h-4 w-4 text-muted-foreground group-hover/milestone:text-white/40" />
          )}
        </button>

        {editingMilestoneId === m.id ? (
          <div className="flex-1 flex items-center gap-2">
            <input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="bg-white/5 border border-white/10 rounded px-2 py-0.5 text-xs text-white w-full focus:outline-none focus:border-primary/50"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveMilestone(featureId, m.id);
                if (e.key === 'Escape') setEditingMilestoneId(null);
              }}
            />
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleSaveMilestone(featureId, m.id)}>
              <Pencil className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <>
            <span 
              className={cn(
                "text-xs flex-1 truncate",
                m.completed ? "text-muted-foreground line-through" : "text-white/70"
              )}
            >
              {m.name}
            </span>
            
            <div className="flex items-center gap-1 opacity-0 group-hover/milestone:opacity-100 transition-opacity">
              {m.targetDate && (
                <span className="text-[10px] text-muted-foreground mr-2 flex items-center gap-1">
                  <CalendarBlank className="h-3 w-3" />
                  {format(new Date(m.targetDate), 'MMM d')}
                </span>
              )}
              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => onAddMilestone(featureId, m.id)}>
                <Plus className="h-3 w-3" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="icon" variant="ghost" className="h-6 w-6">
                    <DotsThree className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-zinc-900 border-white/10">
                  <DropdownMenuItem onClick={() => handleEditMilestone(m)}>
                    <Pencil className="mr-2 h-3 w-3" /> Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="text-red-400 focus:bg-red-500/10 focus:text-red-400"
                    onClick={() => onDeleteMilestone(featureId, m.id)}
                  >
                    <Trash className="mr-2 h-3 w-3" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {sortedFeatures.map((feature) => (
        <div key={feature.id} className="bg-white/[0.02] border border-white/5 rounded-xl overflow-hidden">
          <div 
            className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.04] transition-colors cursor-pointer group"
            onClick={() => toggleExpand(feature.id)}
          >
            <div className="flex items-center gap-3 flex-1">
              <div className="p-1 hover:bg-white/5 rounded transition-colors text-muted-foreground">
                {expandedIds.has(feature.id) ? <CaretDown className="h-3.5 w-3.5" /> : <CaretRight className="h-3.5 w-3.5" />}
              </div>
              <span className="text-sm font-semibold text-white/90">{feature.name}</span>
              <Badge variant="outline" className={cn("text-[9px] uppercase tracking-wider font-bold h-5", FEATURE_STATUS_CONFIG[feature.status].color)}>
                {FEATURE_STATUS_CONFIG[feature.status].label}
              </Badge>
            </div>
            
            <Button 
              size="sm" 
              variant="ghost" 
              className="opacity-0 group-hover:opacity-100 h-7 text-[10px] uppercase font-bold tracking-wider text-muted-foreground hover:text-white"
              onClick={(e) => {
                e.stopPropagation();
                onAddMilestone(feature.id);
              }}
            >
              <Plus className="h-3 w-3 mr-1.5" />
              Add Milestone
            </Button>
          </div>

          <AnimatePresence>
            {expandedIds.has(feature.id) && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden bg-black/20"
              >
                <div className="px-6 py-4 space-y-1 border-t border-white/[0.03]">
                  {feature.milestones?.map(m => (
                    <MilestoneRow key={m.id} m={m} featureId={feature.id} />
                  ))}
                  {(!feature.milestones || feature.milestones.length === 0) && (
                    <div className="text-[11px] text-white/10 italic text-center py-6">
                      No milestones defined for this feature
                    </div>
                  )}
                  <div className="pt-2">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 text-[10px] uppercase font-bold tracking-widest text-white/20 hover:text-white/60 w-full justify-start gap-2"
                      onClick={() => onAddMilestone(feature.id)}
                    >
                      <Plus className="h-3 w-3" />
                      Add Top Level Milestone
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
      {features.length === 0 && (
        <div className="py-20 text-center border border-dashed border-white/5 rounded-2xl">
          <p className="text-sm text-white/20">No features assigned to this project yet.</p>
        </div>
      )}
    </div>
  );
};
