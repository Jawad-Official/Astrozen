import { useMemo } from 'react';
import { useIssueStore } from '@/store/issueStore';
import { 
  Issue, 
  IssueStatus, 
  STATUS_CONFIG, 
  PRIORITY_CONFIG,
  Project
} from '@/types/issue';
import { Feature } from '@/types/feature';
import { CircleNotch, Plus } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { 
  IssueStatusIcon,
  IssueStatusBadge, 
  getStatusColorClass 
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
  const groupedIssues = useMemo(() => {
    const groups: Record<IssueStatus, Issue[]> = { backlog: [], todo: [], in_progress: [], done: [], cancelled: [] };
    issues.forEach((issue) => { if (issue.status && groups[issue.status]) groups[issue.status].push(issue); });
    
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
  
  // Create issue list for parent lookup (including those not in the current filtered view)
  const { getIssueById } = useIssueStore();
  
  const statusOrder: IssueStatus[] = ['backlog', 'todo', 'in_progress', 'done', 'cancelled'];
  
  if (loading) return (<div className="flex-1 flex items-center justify-center bg-[#090909]"><CircleNotch className="h-8 w-8 animate-spin text-primary/40" /></div>);
  return (
    <div className="flex-1 overflow-y-auto scrollbar-none bg-[#090909] px-2">
      <div className="max-w-7xl mx-auto space-y-6 pb-20 pt-4">
        {statusOrder.map((status) => {
          const statusIssues = groupedIssues[status];
          if (statusIssues.length === 0) return null;
          return (
            <div key={status} className="transition-all duration-500 mb-8">
              <div className="flex items-center gap-3 px-4 py-2 mb-2">
                <IssueStatusBadge status={status} className="px-2 font-black tracking-[0.2em] gap-2">
                  <IssueStatusIcon status={status} />
                  {STATUS_CONFIG[status].label}
                </IssueStatusBadge>
                <span className="flex h-5 w-5 items-center justify-center rounded-md bg-white/5 text-[10px] font-bold text-white/30 border border-white/5">{statusIssues.length}</span>
              </div>
              <div className="space-y-[1px]">
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
              </div>
            </div>
          );
        })}
        {issues.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center min-h-[400px] animate-in fade-in zoom-in duration-500">
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
        )}
      </div>
    </div>
  );
}
