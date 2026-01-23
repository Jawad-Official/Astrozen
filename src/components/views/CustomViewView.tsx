import { useMemo, useState } from 'react';
import { useIssueStore } from '@/store/issueStore';
import { Button } from '@/components/ui/button';
import { 
  Filter, 
  ChevronRight,
  MoreHorizontal,
  Star,
  Eye,
  Plus,
  ChevronDown,
  Lock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { StatusIcon } from '@/components/issues/StatusIcon';
import { PriorityIcon } from '@/components/issues/PriorityIcon';
import { STATUS_CONFIG, IssueStatus, Issue } from '@/types/issue';
import { Badge } from '@/components/ui/badge';

const labelColors: Record<string, string> = {
  red: 'bg-[hsl(var(--label-red))]',
  orange: 'bg-[hsl(var(--label-orange))]',
  yellow: 'bg-[hsl(var(--label-yellow))]',
  green: 'bg-[hsl(var(--label-green))]',
  blue: 'bg-[hsl(var(--label-blue))]',
  purple: 'bg-[hsl(var(--label-purple))]',
  pink: 'bg-[hsl(var(--label-pink))]',
};

interface BoardCardProps {
  issue: Issue;
  onClick: () => void;
}

function BoardCard({ issue, onClick }: BoardCardProps) {
  const { projects } = useIssueStore();
  const project = projects.find(p => p.id === issue.projectId);

  return (
    <div 
      onClick={onClick}
      className="bg-card border border-white/5 rounded-lg p-3 hover:bg-white/5 cursor-pointer transition-colors"
    >
      <div className="flex items-start justify-between mb-2">
        <span className="text-xs text-muted-foreground font-mono">{issue.identifier}</span>
        {issue.assignee && (
          <div className="h-5 w-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-[9px] font-medium">
            {issue.assignee.split(' ').map(n => n[0]).join('')}
          </div>
        )}
      </div>
      
      <div className="flex items-start gap-2 mb-2">
        <StatusIcon status={issue.status} className="mt-0.5 shrink-0" />
        <span className="text-sm">{issue.title}</span>
      </div>
      
      <div className="flex items-center gap-2 flex-wrap">
        {issue.labels.map(label => (
          <Badge
            key={label.id}
            variant="secondary"
            className={cn(
              'text-[10px] px-1.5 py-0 h-5',
              labelColors[label.color]
            )}
          >
            {label.name}
          </Badge>
        ))}
        
        {project && (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5">
            {project.icon} {project.name}
          </Badge>
        )}
      </div>
    </div>
  );
}

interface BoardColumnProps {
  status: IssueStatus;
  issues: Issue[];
  onIssueClick: (id: string) => void;
}

function BoardColumn({ status, issues, onIssueClick }: BoardColumnProps) {
  const { updateIssue } = useIssueStore();

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.add('bg-white/5');
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.currentTarget.classList.remove('bg-white/5');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.remove('bg-white/5');
    const issueId = e.dataTransfer.getData('issueId');
    if (issueId) {
      updateIssue(issueId, { status });
    }
  };

  return (
    <div
      className="flex flex-col w-72 min-w-[18rem] transition-colors rounded-lg"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="flex items-center gap-2 px-3 py-2 mb-2">
        <StatusIcon status={status} />
        <span className="text-sm font-medium">{STATUS_CONFIG[status].label}</span>
        <span className="text-xs text-muted-foreground">{issues.length}</span>
        <div className="flex-1" />
        <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground cursor-pointer opacity-0 group-hover:opacity-100" />
        <Plus className="h-3.5 w-3.5 text-muted-foreground cursor-pointer" />
      </div>
      
      <div className="flex-1 space-y-2 px-1 overflow-y-auto scrollbar-thin">
        {issues.map(issue => (
          <div
            key={issue.id}
            draggable
            onDragStart={(e) => e.dataTransfer.setData('issueId', issue.id)}
          >
            <BoardCard issue={issue} onClick={() => onIssueClick(issue.id)} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function CustomViewView() {
  const { 
    customViews, 
    selectedCustomViewId, 
    getFilteredIssues, 
    setSelectedIssue,
    setCurrentView,
  } = useIssueStore();
  
  const view = customViews.find(v => v.id === selectedCustomViewId);
  const issues = getFilteredIssues();
  const [showRightPanel, setShowRightPanel] = useState(true);

  const groupedIssues = useMemo(() => {
    const groups: Record<IssueStatus, Issue[]> = {
      backlog: [],
      todo: [],
      in_progress: [],
      done: [],
      cancelled: [],
    };
    issues.forEach(issue => {
      groups[issue.status].push(issue);
    });
    return groups;
  }, [issues]);

  const visibleStatuses: IssueStatus[] = ['backlog', 'in_progress', 'done'];

  if (!view) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        View not found
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-2 px-4 h-12 border-b border-white/5">
          <button 
            onClick={() => setCurrentView('views')}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Views
          </button>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          <Eye className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">{view.name}</span>
          <Star className="h-3.5 w-3.5 text-muted-foreground ml-1 cursor-pointer hover:text-yellow-400" />
          <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground ml-1 cursor-pointer hover:text-foreground" />
        </div>

        {/* Filter bar */}
        <div className="flex items-center px-4 h-10 border-b border-white/5">
          <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-muted-foreground">
            <Filter className="h-3.5 w-3.5" />
            Filter
          </Button>
        </div>

        {/* Board */}
        <div className="flex-1 flex overflow-x-auto p-4 gap-4 scrollbar-thin">
          {visibleStatuses.map(status => (
            <BoardColumn
              key={status}
              status={status}
              issues={groupedIssues[status]}
              onIssueClick={setSelectedIssue}
            />
          ))}
          
          {/* Hidden columns dropdown */}
          <div className="flex flex-col w-48 min-w-[12rem]">
            <button className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground">
              <ChevronDown className="h-3.5 w-3.5" />
              Hidden columns
            </button>
          </div>
        </div>
      </div>

      {/* Right panel */}
      {showRightPanel && (
        <div className="w-72 border-l border-white/5 flex flex-col">
          <div className="flex items-center gap-2 px-4 h-12 border-b border-white/5">
            <Eye className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">{view.name}</span>
            <div className="flex-1" />
            <Star className="h-3.5 w-3.5 text-muted-foreground cursor-pointer hover:text-yellow-400" />
            <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground cursor-pointer hover:text-foreground" />
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Statuses shown */}
            <div>
              <p className="text-xs text-muted-foreground mb-2">Showing statuses:</p>
              <div className="space-y-1">
                {visibleStatuses.map(status => (
                  <div key={status} className="flex items-center gap-2 text-sm">
                    <StatusIcon status={status} />
                    <span>{STATUS_CONFIG[status].label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Visibility */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Visibility</span>
              <span className="flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5" />
                {view.visibility === 'personal' ? 'Personal' : 'Team'}
              </span>
            </div>

            {/* Owner */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Owner</span>
              <span className="flex items-center gap-1.5">
                <div className="h-5 w-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-[9px] font-medium">
                  {view.owner.split(' ').map(n => n[0]).join('')}
                </div>
                {view.owner}
              </span>
            </div>

            {/* Assignees / Labels / Projects tabs */}
            <div className="pt-4 border-t border-white/5">
              <div className="flex gap-2 mb-3">
                <button className="flex-1 text-xs py-1.5 bg-white/10 rounded-md">Assignees</button>
                <button className="flex-1 text-xs py-1.5 text-muted-foreground hover:bg-white/5 rounded-md">Labels</button>
                <button className="flex-1 text-xs py-1.5 text-muted-foreground hover:bg-white/5 rounded-md">Projects</button>
              </div>
              
              {/* Assignee list */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-5 w-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-[9px] font-medium">
                    J
                  </div>
                  <span className="text-xs flex-1">jawadcoder0</span>
                  <span className="text-xs text-muted-foreground">2</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-5 w-5 rounded-full bg-muted/50 flex items-center justify-center text-muted-foreground text-[9px]">
                    ?
                  </div>
                  <span className="text-xs flex-1 text-muted-foreground">No assignee</span>
                  <span className="text-xs text-muted-foreground">1</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}