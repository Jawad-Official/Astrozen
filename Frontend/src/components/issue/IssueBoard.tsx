import { useMemo } from 'react';
import { useIssueStore } from '@/store/issueStore';
import { 
  Issue, 
  IssueStatus, 
  IssuePriority, 
  STATUS_CONFIG, 
  PRIORITY_CONFIG,
  Project
} from '@/types/issue';
import { Feature } from '@/types/feature';
import { 
  Plus, 
  Diamond
} from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { 
  IssueStatusBadge, 
  IssuePriorityIcon, 
  IssueTypeIcon, 
  IssueIdentifier,
  getStatusColorClass 
} from './IssueAtomicComponents';
import { Badge } from '@/components/ui/badge';

const getInitials = (name?: string) => {
  if (!name) return '?';
  return name.split(' ').map(n => n?.[0] || '').join('').toUpperCase().slice(0, 2);
};

interface IssueBoardProps {
  issues: Issue[];
  projects: Project[];
  features: Feature[];
  orgMembers: any[];
  onUpdateIssue: (id: string, updates: Partial<Issue>) => void;
  onCreateIssue?: () => void;
}

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
    
    // Sort each group by priority
    Object.keys(groups).forEach(status => {
      groups[status as IssueStatus].sort((a, b) => {
        const orderA = PRIORITY_CONFIG[a.priority]?.order ?? 4;
        const orderB = PRIORITY_CONFIG[b.priority]?.order ?? 4;
        return orderA - orderB;
      });
    });
    
    return groups;
  }, [issues]);
  const visibleStatuses: IssueStatus[] = ['backlog', 'todo', 'in_progress', 'done'];
  return (
    <div className="flex-1 flex flex-col min-h-0 relative">
      {issues.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-in fade-in zoom-in duration-500">
          <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-center mb-6 shadow-2xl">
            <span className="text-3xl opacity-50">🔍</span>
          </div>
          <h3 className="text-xl font-semibold text-white/90 mb-2">No issues found</h3>
          <p className="text-sm text-white/40 mb-8 max-w-[280px] text-center">There are no issues matching your current view or filters.</p>
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
      ) : (
        <div className="flex-1 flex overflow-x-auto scrollbar-thin p-4 gap-4">
          {visibleStatuses.map((status) => (
            <div key={status} className="flex flex-col w-72 min-w-[18rem] bg-muted/30 transition-colors">
              <div className="flex items-center gap-2 p-3 border-b border-border">
                <IssueStatusBadge status={status} className="h-6 px-2 tracking-wider" />
                <span className="text-xs text-muted-foreground ml-auto">{groupedIssues[status].length}</span>
              </div>
              <div className="flex-1 p-2 space-y-2 overflow-y-auto scrollbar-thin">
                {groupedIssues[status].map((issue) => (
              <div key={issue.id} className="bg-card border border-border p-3 hover:bg-accent/30 cursor-pointer transition-colors rounded-lg group">
                <div className="flex items-center justify-between mb-2">
                  <IssueIdentifier identifier={issue.identifier} className="group-hover:text-white" />
                  <div className="flex items-center gap-1.5">
                    <IssuePriorityIcon priority={issue.priority} />
                    <IssueTypeIcon type={issue.issueType} className="opacity-50" />
                  </div>
                </div>
                                  <div className="flex items-start gap-2 mb-3">
                                    <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                                      <span className="text-sm font-medium text-foreground/90 group-hover:text-foreground transition-colors truncate">
                                        {issue.title}
                                      </span>
                                      {issue.parentId && (() => {
                                        const parent = getIssueById(issue.parentId);
                                        return parent ? (
                                          <div className="flex items-center gap-1 text-[10px] text-muted-foreground/50 font-medium truncate">
                                            <span>&gt;</span>
                                            <span>{parent.title}</span>
                                          </div>
                                        ) : null;
                                      })()}
                                    </div>
                                  </div>                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex-1" />
                  {(() => {
                    const assigneeName = issue.assigneeName || orgMembers.find(m => m.id === issue.assignee)?.full_name;
                    return assigneeName ? (
                      <div className="flex h-5 w-5 items-center justify-center bg-primary/20 text-primary text-[10px] font-bold rounded-full border border-primary/20">
                        {getInitials(assigneeName)}
                      </div>
                    ) : null;
                  })()}
                </div>
              </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
