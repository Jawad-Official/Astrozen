import { useMemo, useState } from 'react';
import { useIssueStore } from '@/store/issueStore';
import { 
  Issue, 
  IssueStatus, 
  STATUS_CONFIG,
  PRIORITY_CONFIG,
  Project
} from '@/types/issue';
import { Feature } from '@/types/feature';
import { CircleNotch, Plus, CaretDown, CircleDashed } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { 
  IssueStatusIcon
} from './IssueAtomicComponents';
import { IssueRow } from './IssueRow';
import { SubIssueRow } from './SubIssueRow';

interface IssueListProps {
  issues: Issue[];
  loading?: boolean;
  projects: Project[];
  features: Feature[];
  orgMembers: any[];
  onUpdateIssue: (id: string, updates: Partial<Issue>) => Promise<void>;
  onDeleteIssue: (id: string) => Promise<void>;
  onSelectIssue: (id: string) => void;
  onCreateIssue?: () => void;
  onCreateSubIssue?: (parentId: string) => void;
}

export function IssueList({ 
  issues, 
  loading, 
  projects, 
  features, 
  orgMembers, 
  onUpdateIssue, 
  onDeleteIssue, 
  onSelectIssue, 
  onCreateIssue, 
  onCreateSubIssue 
}: IssueListProps) {
  const [manualCollapsibleStates, setManualCollapsibleStates] = useState<Record<IssueStatus, boolean>>({} as any);
  const { getIssueById } = useIssueStore();
  
  const groupedIssues = useMemo(() => {
    const groups: Record<IssueStatus, Issue[]> = { backlog: [], todo: [], in_progress: [], done: [], cancelled: [] };
    issues.forEach((issue) => { if (issue.status && groups[issue.status]) groups[issue.status].push(issue); });
    
    Object.keys(groups).forEach(status => {
      groups[status as IssueStatus].sort((a, b) => {
        const orderA = PRIORITY_CONFIG[a.priority]?.order ?? 4;
        const orderB = PRIORITY_CONFIG[b.priority]?.order ?? 4;
        return orderA - orderB;
      });
    });
    
    return groups;
  }, [issues]);
  
  const statusOrder: IssueStatus[] = ['backlog', 'todo', 'in_progress', 'done', 'cancelled'];
  
  const getStatusColorClass = (status: IssueStatus) => {
    switch (status) {
      case 'backlog': return 'text-muted-foreground/60';
      case 'todo': return 'text-muted-foreground';
      case 'in_progress': return 'text-yellow-600 dark:text-yellow-400';
      case 'done': return 'text-emerald-600 dark:text-emerald-400';
      case 'cancelled': return 'text-red-600 dark:text-red-400';
      default: return 'text-muted-foreground';
    }
  };

  const handleDragOverStatus = (status: IssueStatus) => {
    setManualCollapsibleStates(prev => ({ ...prev, [status]: true }));
  };
  
  if (loading) return (
    <div className="flex-1 flex items-center justify-center bg-background">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
    </div>
  );
  
  return (
    <div className="flex-1 overflow-y-auto scrollbar-none bg-background px-2">
      <div className="max-w-7xl mx-auto space-y-6 pb-20 pt-4">
        {statusOrder.map((status) => {
          const statusIssues = groupedIssues[status];
          const isDefaultOpen = statusIssues.length > 0;
          const isOpen = manualCollapsibleStates[status] === undefined
            ? isDefaultOpen
            : manualCollapsibleStates[status];
            
          return (
            <Collapsible 
              key={status} 
              open={isOpen}
              onOpenChange={(open) => setManualCollapsibleStates(prev => ({ ...prev, [status]: open }))}
              className="transition-all duration-500"
              data-status={status}
            >
              <CollapsibleTrigger className="flex items-center gap-3 px-4 py-2 mb-2 w-full group text-left">
                <CaretDown className="h-3.5 w-3.5 transition-transform group-data-[state=closed]:-rotate-90 text-muted-foreground/50 group-hover:text-muted-foreground shrink-0" />
                <div className="flex items-center gap-2 flex-1">
                  <IssueStatusIcon status={status} className="h-4 w-4" />
                  <span className={cn("text-[10px] font-black uppercase tracking-[0.2em]", getStatusColorClass(status))}>
                    {STATUS_CONFIG[status].label}
                  </span>
                </div>
                <span className="flex h-5 w-5 items-center justify-center rounded-md bg-muted text-[10px] font-bold text-muted-foreground/40 border border-border shrink-0">{statusIssues.length}</span>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="space-y-0.5 min-h-[50px] border border-dashed border-border rounded-xl p-1">
                  {statusIssues.map((issue) => {
                    const parentIssue = issue.parentId ? getIssueById(issue.parentId) : undefined;
                    
                    if (issue.parentId && parentIssue) {
                      return (
                        <SubIssueRow
                          key={issue.id}
                          issue={issue}
                          parentIssue={parentIssue}
                          projects={projects}
                          features={features}
                          orgMembers={orgMembers}
                          onUpdate={onUpdateIssue}
                          onDelete={onDeleteIssue}
                          onClick={() => onSelectIssue(issue.id)}
                        />
                      );
                    }

                    return (
                      <IssueRow 
                        key={issue.id} 
                        issue={issue} 
                        projects={projects} 
                        features={features} 
                        orgMembers={orgMembers} 
                        onUpdate={onUpdateIssue} 
                        onDelete={onDeleteIssue} 
                        onClick={() => onSelectIssue(issue.id)} 
                        onCreateSubIssue={onCreateSubIssue}
                      />
                    );
                  })}
                  {statusIssues.length === 0 && (
                    <div className="text-[10px] text-muted-foreground/20 italic text-center py-4">Drop issues here to set status</div>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          );
        })}
        
        {issues.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center py-20 text-center animate-in fade-in zoom-in duration-500">
            <div className="w-16 h-16 rounded-2xl bg-muted border border-border flex items-center justify-center mb-6 shadow-2xl">
              <CircleDashed className="h-8 w-8 text-muted-foreground/40" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">No issues found</h3>
            <p className="text-sm text-muted-foreground mb-8 max-w-[280px] text-center">
              Start by creating an issue to track your work.
            </p>
            {onCreateIssue && (
              <Button 
                onClick={onCreateIssue}
                className="h-10 px-6 gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all hover:scale-105"
              >
                <Plus className="h-4 w-4" />
                Create Issue
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
