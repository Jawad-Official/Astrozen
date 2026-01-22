import { useMemo } from 'react';
import { useIssueStore } from '@/store/issueStore';
import { IssueRow } from '@/components/issues/IssueRow';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { format, differenceInDays } from 'date-fns';
import { ArrowLeft, Calendar, Target, BarChart3 } from 'lucide-react';
import { STATUS_CONFIG, IssueStatus } from '@/types/issue';

export function CycleView() {
  const { 
    selectedCycleId, 
    cycles, 
    getCycleIssues, 
    setCurrentView, 
    setSelectedCycle,
    setSelectedIssue 
  } = useIssueStore();
  
  const cycle = cycles.find(c => c.id === selectedCycleId);
  const issues = selectedCycleId ? getCycleIssues(selectedCycleId) : [];
  
  const stats = useMemo(() => {
    const completed = issues.filter(i => i.status === 'done').length;
    const inProgress = issues.filter(i => i.status === 'in_progress').length;
    const todo = issues.filter(i => i.status === 'todo').length;
    const backlog = issues.filter(i => i.status === 'backlog').length;
    const totalPoints = issues.reduce((sum, i) => sum + (i.estimate || 0), 0);
    const completedPoints = issues
      .filter(i => i.status === 'done')
      .reduce((sum, i) => sum + (i.estimate || 0), 0);
    
    return { 
      total: issues.length, 
      completed, 
      inProgress, 
      todo, 
      backlog,
      totalPoints,
      completedPoints,
      progress: issues.length > 0 ? Math.round((completed / issues.length) * 100) : 0,
    };
  }, [issues]);
  
  const groupedIssues = useMemo(() => {
    const groups: Record<IssueStatus, typeof issues> = {
      backlog: [],
      todo: [],
      in_progress: [],
      done: [],
      cancelled: [],
    };
    issues.forEach((issue) => {
      groups[issue.status].push(issue);
    });
    return groups;
  }, [issues]);
  
  if (!cycle) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <p>Cycle not found</p>
      </div>
    );
  }
  
  const daysLeft = differenceInDays(cycle.endDate, new Date());
  
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b border-border p-4">
        <div className="flex items-center gap-3 mb-4">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8"
            onClick={() => { setSelectedCycle(null); setCurrentView('all'); }}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Target className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold">{cycle.name}</h1>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-muted/50 p-3">
            <div className="text-2xl font-bold">{stats.progress}%</div>
            <div className="text-xs text-muted-foreground">Completed</div>
          </div>
          <div className="bg-muted/50 p-3">
            <div className="text-2xl font-bold">{stats.completed}/{stats.total}</div>
            <div className="text-xs text-muted-foreground">Issues Done</div>
          </div>
          <div className="bg-muted/50 p-3">
            <div className="text-2xl font-bold">{stats.completedPoints}/{stats.totalPoints}</div>
            <div className="text-xs text-muted-foreground">Points Completed</div>
          </div>
          <div className="bg-muted/50 p-3">
            <div className="text-2xl font-bold">{daysLeft > 0 ? daysLeft : 0}</div>
            <div className="text-xs text-muted-foreground">Days Remaining</div>
          </div>
        </div>
        
        <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4" />
            <span>{format(cycle.startDate, 'MMM d')} - {format(cycle.endDate, 'MMM d, yyyy')}</span>
          </div>
        </div>
        
        <Progress value={stats.progress} className="h-2 mt-4" />
      </div>
      
      {/* Issues list */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {(['in_progress', 'todo', 'backlog', 'done', 'cancelled'] as IssueStatus[]).map((status) => {
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
        
        {issues.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <p className="text-sm">No issues in this cycle</p>
            <p className="text-xs mt-1">Add issues to this cycle from the issue detail panel</p>
          </div>
        )}
      </div>
    </div>
  );
}