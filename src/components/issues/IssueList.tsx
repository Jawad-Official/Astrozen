import { useMemo } from 'react';
import { useIssueStore } from '@/store/issueStore';
import { IssueRow } from './IssueRow';
import { STATUS_CONFIG, IssueStatus } from '@/types/issue';

export function IssueList() {
  const { getFilteredIssues, setSelectedIssue } = useIssueStore();

  const filteredIssues = getFilteredIssues();

  const groupedIssues = useMemo(() => {
    const groups: Record<IssueStatus, typeof filteredIssues> = {
      backlog: [],
      todo: [],
      in_progress: [],
      done: [],
      cancelled: [],
    };

    filteredIssues.forEach((issue) => {
      groups[issue.status].push(issue);
    });

    return groups;
  }, [filteredIssues]);

  const statusOrder: IssueStatus[] = ['in_progress', 'todo', 'backlog', 'done', 'cancelled'];

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
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

      {filteredIssues.length === 0 && (
        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
          <p className="text-sm">No issues found</p>
          <p className="text-xs mt-1">Create a new issue to get started</p>
        </div>
      )}
    </div>
  );
}
