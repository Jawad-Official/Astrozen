import React from 'react';
import { Feature, FeatureStatus } from '@/types/feature';
import { Project } from '@/types/issue';
import { Team } from '@/types/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FEATURE_STATUS_CONFIG, FeatureWindow } from './FeatureWindow';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface FeatureKanbanProps {
  features: Feature[];
  projects: Project[];
  teams?: Team[];
  onSelectFeature: (id: string) => void;
  onUpdateFeature: (id: string, updates: Partial<Feature>) => Promise<void>;
}

const COLUMNS: FeatureStatus[] = ['discovery', 'validated', 'in_build', 'in_review', 'shipped'];

export const FeatureKanban: React.FC<FeatureKanbanProps> = ({
  features,
  projects,
  onSelectFeature,
  onUpdateFeature
}) => {
  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('featureId', id);
  };

  const handleDrop = async (e: React.DragEvent, status: FeatureStatus) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('featureId');
    if (id) {
      await onUpdateFeature(id, { status });
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <div className="flex-1 flex gap-4 p-6 overflow-x-auto bg-[#090909]">
      {COLUMNS.map((status) => {
        const columnFeatures = features.filter((f) => f.status === status);
        const config = FEATURE_STATUS_CONFIG[status];

        return (
          <div 
            key={status} 
            className="flex-shrink-0 w-80 flex flex-col gap-4"
            onDrop={(e) => handleDrop(e, status)}
            onDragOver={handleDragOver}
          >
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-2">
                <div className={cn("w-2 h-2 rounded-full", config.color.replace('text-', 'bg-'))} />
                <h3 className="text-sm font-bold uppercase tracking-widest text-white/60">{config.label}</h3>
                <Badge variant="secondary" className="bg-white/5 text-white/40 border-none h-5 px-1.5">{columnFeatures.length}</Badge>
              </div>
            </div>

            <ScrollArea className="flex-1">
              <div className="flex flex-col gap-3 pb-10">
                {columnFeatures.map((feature) => {
                  const project = projects.find(p => p.id === feature.projectId);
                  
                  return (
                    <motion.div
                      layout
                      key={feature.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e as unknown as React.DragEvent, feature.id)}
                      onClick={() => onSelectFeature(feature.id)}
                      className="group p-4 rounded-xl bg-white/[0.03] border border-white/[0.05] hover:border-primary/30 transition-all cursor-grab active:cursor-grabbing hover:bg-white/[0.05]"
                    >
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">{feature.identifier}</span>
                          <FeatureWindow.PriorityIcon priority={feature.priority || 'none'} />
                        </div>
                        <div className="flex items-center gap-2 min-w-0">
                          <h4 className="text-sm font-semibold text-white/90 group-hover:text-white transition-colors truncate">
                            {feature.name}
                          </h4>
                          {feature.parentId && (
                            <div className="flex items-center gap-1 text-white/20 shrink-0">
                              <span className="text-[9px] font-bold">&gt;</span>
                              <span className="text-[9px] font-bold truncate max-w-[80px]">
                                {features.find(f => f.id === feature.parentId)?.name || '...'}
                              </span>
                            </div>
                          )}
                        </div>
                        {project && (
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs">{project.icon}</span>
                            <span className="text-[10px] font-medium text-white/40 truncate">{project.name}</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between mt-2">
                           <FeatureWindow.HealthIcon health={feature.health} />
                           {feature.milestones && feature.milestones.length > 0 && (
                             <div className="flex items-center gap-1.5 text-[10px] text-white/20">
                               <span className="font-bold">{feature.milestones.filter(m => m.completed).length}/{feature.milestones.length}</span>
                               <span>milestones</span>
                             </div>
                           )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
                {columnFeatures.length === 0 && (
                  <div className="h-32 rounded-xl border border-dashed border-white/5 flex items-center justify-center">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-white/10">Empty</span>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        );
      })}
    </div>
  );
};
