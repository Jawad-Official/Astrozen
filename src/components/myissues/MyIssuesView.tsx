import { useMemo } from 'react';
import { useIssueStore } from '@/store/issueStore';
import { IssueRow } from '@/components/issues/IssueRow';
import { STATUS_CONFIG, IssueStatus } from '@/types/issue';
import { User } from 'lucide-react';

export function MyIssuesView() {
  const { getMyIssues, setSelectedIssue, currentUser } = useIssueStore();
  
  const myIssues = getMyIssues();
  
  const groupedIssues = useMemo(() => {
    const groups: Record<IssueStatus, typeof myIssues> = {
      backlog: [],
      todo: [],
      in_progress: [],
      done: [],
      cancelled: [],
    };
    myIssues.forEach((issue) => {
      groups[issue.status].push(issue);
    });
    return groups;
  }, [myIssues]);
  
  const statusOrder: IssueStatus[] = ['in_progress', 'todo', 'backlog', 'done'];
  
  return (
    <div className="flex-1 overflow-y-auto">
      {/* Header */}
      <div className="border-b border-border p-4 flex items-center gap-3">
        <div className="h-8 w-8 bg-primary/20 text-primary font-medium flex items-center justify-center">
          {currentUser.split(' ').map(n => n[0]).join('')}
        </div>
        <div>
          <h1 className="text-lg font-semibold">My Issues</h1>
          <p className="text-xs text-muted-foreground">{myIssues.length} issues assigned to you</p>
        </div>
      </div>
      
      {/* Issues List */}
      <div className="scrollbar-thin">
        {statusOrder.map((status) => {
          const statusIssues = groupedIssues[status];
          if (statusIssues.length === 0) return null;
          
          return (
            <div key={status} className="border-b border-border">
              <div className="flex items-center gap-2 px-4 py-2 bg-muted/50 sticky top-0 z-10">
                <span className="text-xs font-medium text-muted-foreground">
                  {STATUS_CONFIG[status].label}
                </span>
                <span className="text-xs text-muted-foreground">
                  {statusIssues.length}
                </span>
              </div>
              {statusIssues.map((issue) => (
                <IssueRow 
                  key={issue.id} 
                  issue={issue} 
                  onClick={() => setSelectedIssue(issue.id)}
                />
              ))}
            </div>
          );
        })}
      </div>
      
      {/* Empty State */}
      {myIssues.length === 0 && (
        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
          <User className="h-12 w-12 mb-4 opacity-50" />
          <p className="text-lg font-medium">No issues assigned</p>
          <p className="text-sm mt-1">Issues assigned to you will appear here</p>
        </div>
      )}
    </div>
  );
}