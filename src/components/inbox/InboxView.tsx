import { useMemo } from 'react';
import { useIssueStore } from '@/store/issueStore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatusIcon } from '@/components/issues/StatusIcon';
import { PriorityIcon } from '@/components/issues/PriorityIcon';
import { 
  Inbox, 
  Check, 
  X, 
  Copy, 
  ChevronRight,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

const labelColors: Record<string, string> = {
  red: 'bg-[hsl(var(--label-red))]',
  orange: 'bg-[hsl(var(--label-orange))]',
  yellow: 'bg-[hsl(var(--label-yellow))]',
  green: 'bg-[hsl(var(--label-green))]',
  blue: 'bg-[hsl(var(--label-blue))]',
  purple: 'bg-[hsl(var(--label-purple))]',
  pink: 'bg-[hsl(var(--label-pink))]',
};

export function InboxView() {
  const { 
    getTriageIssues, 
    triageIssue, 
    setSelectedIssue,
    projects,
  } = useIssueStore();
  
  const triageIssues = getTriageIssues();
  
  const handleAccept = (e: React.MouseEvent, issueId: string) => {
    e.stopPropagation();
    triageIssue(issueId, 'accepted');
  };
  
  const handleDecline = (e: React.MouseEvent, issueId: string) => {
    e.stopPropagation();
    triageIssue(issueId, 'declined');
  };
  
  const handleDuplicate = (e: React.MouseEvent, issueId: string) => {
    e.stopPropagation();
    triageIssue(issueId, 'duplicate');
  };
  
  return (
    <div className="flex-1 overflow-y-auto">
      {/* Header */}
      <div className="border-b border-border p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Inbox className="h-5 w-5" />
          <h1 className="text-lg font-semibold">Inbox</h1>
          {triageIssues.length > 0 && (
            <Badge variant="secondary">{triageIssues.length}</Badge>
          )}
        </div>
      </div>
      
      {/* Triage Queue */}
      <div className="divide-y divide-border">
        {triageIssues.map((issue) => {
          const project = projects.find(p => p.id === issue.projectId);
          
          return (
            <div
              key={issue.id}
              className="p-4 hover:bg-accent/30 cursor-pointer transition-colors"
              onClick={() => setSelectedIssue(issue.id)}
            >
              <div className="flex items-start gap-3">
                {/* Priority */}
                <PriorityIcon priority={issue.priority} className="mt-0.5" />
                
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-muted-foreground font-mono">
                      {issue.identifier}
                    </span>
                    {project && (
                      <span className="text-xs text-muted-foreground">
                        {project.icon} {project.name}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground flex items-center gap-1 ml-auto">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(issue.createdAt, { addSuffix: true })}
                    </span>
                  </div>
                  
                  <h3 className="font-medium mb-1">{issue.title}</h3>
                  
                  {issue.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                      {issue.description}
                    </p>
                  )}
                  
                  {/* Labels */}
                  {issue.labels.length > 0 && (
                    <div className="flex items-center gap-1 mb-3">
                      {issue.labels.map((label) => (
                        <span
                          key={label.id}
                          className={cn(
                            'px-1.5 py-0.5 text-xs font-medium text-foreground',
                            labelColors[label.color]
                          )}
                        >
                          {label.name}
                        </span>
                      ))}
                    </div>
                  )}
                  
                  {/* Triage Actions */}
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="default"
                      className="h-7 gap-1.5"
                      onClick={(e) => handleAccept(e, issue.id)}
                    >
                      <Check className="h-3.5 w-3.5" />
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 gap-1.5"
                      onClick={(e) => handleDecline(e, issue.id)}
                    >
                      <X className="h-3.5 w-3.5" />
                      Decline
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 gap-1.5"
                      onClick={(e) => handleDuplicate(e, issue.id)}
                    >
                      <Copy className="h-3.5 w-3.5" />
                      Duplicate
                    </Button>
                  </div>
                </div>
                
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Empty State */}
      {triageIssues.length === 0 && (
        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
          <Inbox className="h-12 w-12 mb-4 opacity-50" />
          <p className="text-lg font-medium">Inbox zero!</p>
          <p className="text-sm mt-1">No issues need triage</p>
        </div>
      )}
    </div>
  );
}