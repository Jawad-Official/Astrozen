import { useMemo } from 'react';
import { useIssueStore } from '@/store/issueStore';
import { StatusIcon } from './StatusIcon';
import { PriorityIcon } from './PriorityIcon';
import { STATUS_CONFIG, IssueStatus, Issue } from '@/types/issue';
import { cn } from '@/lib/utils';

interface IssueBoardCardProps {
  issue: Issue;
}

const labelColors: Record<string, string> = {
  red: 'bg-[hsl(var(--label-red))]',
  orange: 'bg-[hsl(var(--label-orange))]',
  yellow: 'bg-[hsl(var(--label-yellow))]',
  green: 'bg-[hsl(var(--label-green))]',
  blue: 'bg-[hsl(var(--label-blue))]',
  purple: 'bg-[hsl(var(--label-purple))]',
  pink: 'bg-[hsl(var(--label-pink))]',
};

function IssueBoardCard({ issue }: IssueBoardCardProps) {
  const { updateIssue, projects } = useIssueStore();
  const project = projects.find((p) => p.id === issue.projectId);

  return (
    <div className="bg-card border border-border p-3 hover:bg-accent/30 cursor-pointer transition-colors">
      <div className="flex items-start gap-2 mb-2">
        <PriorityIcon priority={issue.priority} className="mt-0.5" />
        <span className="text-sm flex-1">{issue.title}</span>
      </div>
      
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground font-mono">
          {issue.identifier}
        </span>
        
        {issue.labels.map((label) => (
          <span
            key={label.id}
            className={cn(
              'px-1.5 py-0.5 text-[10px] font-medium text-foreground',
              labelColors[label.color]
            )}
          >
            {label.name}
          </span>
        ))}
        
        <div className="flex-1" />
        
        {issue.assignee && (
          <div className="flex h-5 w-5 items-center justify-center bg-primary/20 text-primary text-[10px] font-medium">
            {issue.assignee.split(' ').map((n) => n[0]).join('')}
          </div>
        )}
      </div>
    </div>
  );
}

interface BoardColumnProps {
  status: IssueStatus;
  issues: Issue[];
}

function BoardColumn({ status, issues }: BoardColumnProps) {
  const { updateIssue } = useIssueStore();

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.add('bg-accent/30');
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.currentTarget.classList.remove('bg-accent/30');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.remove('bg-accent/30');
    const issueId = e.dataTransfer.getData('issueId');
    if (issueId) {
      updateIssue(issueId, { status });
    }
  };

  return (
    <div
      className="flex flex-col w-72 min-w-[18rem] bg-muted/30 transition-colors"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="flex items-center gap-2 p-3 border-b border-border">
        <StatusIcon status={status} />
        <span className="text-sm font-medium">{STATUS_CONFIG[status].label}</span>
        <span className="text-xs text-muted-foreground ml-auto">{issues.length}</span>
      </div>
      
      <div className="flex-1 p-2 space-y-2 overflow-y-auto scrollbar-thin">
        {issues.map((issue) => (
          <div
            key={issue.id}
            draggable
            onDragStart={(e) => e.dataTransfer.setData('issueId', issue.id)}
          >
            <IssueBoardCard issue={issue} />
          </div>
        ))}
        
        {issues.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No issues
          </div>
        )}
      </div>
    </div>
  );
}

export function IssueBoard() {
  const { getFilteredIssues } = useIssueStore();

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

  const visibleStatuses: IssueStatus[] = ['backlog', 'todo', 'in_progress', 'done'];

  return (
    <div className="flex-1 flex overflow-x-auto scrollbar-thin p-4 gap-4">
      {visibleStatuses.map((status) => (
        <BoardColumn
          key={status}
          status={status}
          issues={groupedIssues[status]}
        />
      ))}
    </div>
  );
}
