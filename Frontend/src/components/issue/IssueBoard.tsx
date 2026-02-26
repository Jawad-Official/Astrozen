import React, { useMemo } from 'react';
import { useIssueStore } from '@/store/issueStore';
import { 
  Issue, 
  IssueStatus, 
  STATUS_CONFIG, 
  PRIORITY_CONFIG,
  Project
} from '@/types/issue';
import { Feature } from '@/types/feature';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { 
  IssueStatusIcon,
  IssuePriorityIcon, 
  IssueTypeIcon, 
  IssueIdentifier
} from './IssueAtomicComponents';

const getInitials = (name?: string) => {
  if (!name) return '?';
  return name.split(' ').map(n => n?.[0] || '').join('').toUpperCase().slice(0, 2);
};

interface IssueBoardProps {
  issues: Issue[];
  projects: Project[];
  features: Feature[];
  orgMembers: any[];
  onUpdateIssue: (id: string, updates: Partial<Issue>) => Promise<void>;
  onCreateIssue?: () => void;
}

const COLUMNS: IssueStatus[] = ['backlog', 'todo', 'in_progress', 'done'];

const getStatusColorClass = (status: IssueStatus) => {
  switch (status) {
    case 'backlog': return 'bg-muted-foreground/40';
    case 'todo': return 'bg-muted-foreground/20';
    case 'in_progress': return 'bg-yellow-500';
    case 'done': return 'bg-emerald-500';
    case 'cancelled': return 'bg-red-500';
    default: return 'bg-muted-foreground/20';
  }
};

export function IssueBoard({ 
  issues, 
  projects, 
  features, 
  orgMembers, 
  onUpdateIssue, 
  onCreateIssue 
}: IssueBoardProps) {
  const { getIssueById } = useIssueStore();
  
  const groupedIssues = useMemo(() => {
    const groups: Record<IssueStatus, Issue[]> = { backlog: [], todo: [], in_progress: [], done: [], cancelled: [] };
    issues.forEach((issue) => { groups[issue.status].push(issue); });
    
    Object.keys(groups).forEach(status => {
      groups[status as IssueStatus].sort((a, b) => {
        const orderA = PRIORITY_CONFIG[a.priority]?.order ?? 4;
        const orderB = PRIORITY_CONFIG[b.priority]?.order ?? 4;
        return orderA - orderB;
      });
    });
    
    return groups;
  }, [issues]);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('issueId', id);
  };

  const handleDrop = async (e: React.DragEvent, status: IssueStatus) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('issueId');
    if (id) {
      await onUpdateIssue(id, { status });
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <div className="flex-1 flex gap-4 p-6 overflow-x-auto bg-background">
      {COLUMNS.map((status) => {
        const columnIssues = groupedIssues[status];
        const config = STATUS_CONFIG[status];

        return (
          <div 
            key={status} 
            className="flex-shrink-0 w-80 flex flex-col gap-4"
            onDrop={(e) => handleDrop(e, status)}
            onDragOver={handleDragOver}
          >
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-2">
                <div className={cn("w-2 h-2 rounded-full", getStatusColorClass(status))} />
                <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">{config.label}</h3>
                <Badge variant="secondary" className="bg-muted text-muted-foreground border-none h-5 px-1.5">{columnIssues.length}</Badge>
              </div>
            </div>

            <ScrollArea className="flex-1">
              <div className="flex flex-col gap-3 pb-10">
                {columnIssues.map((issue) => {
                  const feature = features.find(f => f.id === issue.featureId);
                  const project = feature ? projects.find(p => p.id === feature.projectId) : null;
                  const assigneeName = issue.assigneeName || orgMembers.find(m => m.id === issue.assignee)?.full_name;
                  
                  return (
                    <motion.div
                      layout
                      key={issue.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e as unknown as React.DragEvent, issue.id)}
                      className="group p-4 rounded-xl bg-secondary/30 border border-border hover:border-primary/30 transition-all cursor-grab active:cursor-grabbing hover:bg-secondary/50"
                    >
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                          <IssueIdentifier identifier={issue.identifier} className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50" />
                          <IssuePriorityIcon priority={issue.priority} />
                        </div>
                        <div className="flex items-center gap-2 min-w-0">
                          <h4 className="text-sm font-semibold text-foreground/90 group-hover:text-foreground transition-colors truncate">
                            {issue.title}
                          </h4>
                          {issue.parentId && (() => {
                            const parent = getIssueById(issue.parentId);
                            return parent ? (
                              <div className="flex items-center gap-1 text-muted-foreground/30 shrink-0">
                                <span className="text-[9px] font-bold">&gt;</span>
                                <span className="text-[9px] font-bold truncate max-w-[80px]">
                                  {parent.title}
                                </span>
                              </div>
                            ) : null;
                          })()}
                        </div>
                        {project && (
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs">{project.icon}</span>
                            <span className="text-[10px] font-medium text-muted-foreground truncate">{project.name}</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between mt-2">
                          <IssueTypeIcon type={issue.issueType} className="opacity-50" />
                          {assigneeName && (
                            <div className="flex h-5 w-5 items-center justify-center bg-primary/20 text-primary text-[10px] font-bold rounded-full border border-primary/20">
                              {getInitials(assigneeName)}
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
                {columnIssues.length === 0 && (
                  <div className="h-32 rounded-xl border border-dashed border-border flex items-center justify-center">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/20">Empty</span>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        );
      })}
    </div>
  );
}
