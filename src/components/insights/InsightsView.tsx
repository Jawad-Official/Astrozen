import { useMemo } from 'react';
import { useIssueStore } from '@/store/issueStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { 
  BarChart3, 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Target,
  Users,
  Layers,
} from 'lucide-react';
import { STATUS_CONFIG, PRIORITY_CONFIG, IssueStatus } from '@/types/issue';
import { StatusIcon } from '@/components/issues/StatusIcon';
import { PriorityIcon } from '@/components/issues/PriorityIcon';
import { differenceInDays, format, subDays } from 'date-fns';

export function InsightsView() {
  const { issues, cycles, projects, getActiveCycle, getCycleIssues } = useIssueStore();
  
  const activeCycle = getActiveCycle();
  const activeCycleIssues = activeCycle ? getCycleIssues(activeCycle.id) : [];
  
  const stats = useMemo(() => {
    const total = issues.length;
    const byStatus: Record<IssueStatus, number> = {
      backlog: 0,
      todo: 0,
      in_progress: 0,
      done: 0,
      cancelled: 0,
    };
    
    const byPriority: Record<string, number> = {};
    const byProject: Record<string, number> = {};
    const byAssignee: Record<string, number> = {};
    
    issues.forEach(issue => {
      byStatus[issue.status]++;
      byPriority[issue.priority] = (byPriority[issue.priority] || 0) + 1;
      if (issue.projectId) {
        byProject[issue.projectId] = (byProject[issue.projectId] || 0) + 1;
      }
      if (issue.assignee) {
        byAssignee[issue.assignee] = (byAssignee[issue.assignee] || 0) + 1;
      }
    });
    
    // Completed this week
    const oneWeekAgo = subDays(new Date(), 7);
    const completedThisWeek = issues.filter(
      i => i.status === 'done' && i.updatedAt >= oneWeekAgo
    ).length;
    
    // Average time to complete (rough estimate based on created/updated)
    const completedIssues = issues.filter(i => i.status === 'done');
    const avgDaysToComplete = completedIssues.length > 0
      ? completedIssues.reduce((sum, i) => sum + differenceInDays(i.updatedAt, i.createdAt), 0) / completedIssues.length
      : 0;
    
    // Overdue issues (no dueDate in our current model, so using high priority in_progress > 7 days)
    const overdueCount = issues.filter(i => 
      i.status === 'in_progress' && 
      i.priority === 'urgent' && 
      differenceInDays(new Date(), i.createdAt) > 7
    ).length;
    
    return {
      total,
      byStatus,
      byPriority,
      byProject,
      byAssignee,
      completedThisWeek,
      avgDaysToComplete: Math.round(avgDaysToComplete * 10) / 10,
      overdueCount,
      inProgress: byStatus.in_progress,
      done: byStatus.done,
      completionRate: total > 0 ? Math.round((byStatus.done / total) * 100) : 0,
    };
  }, [issues]);
  
  const cycleStats = useMemo(() => {
    if (!activeCycle) return null;
    
    const total = activeCycleIssues.length;
    const completed = activeCycleIssues.filter(i => i.status === 'done').length;
    const inProgress = activeCycleIssues.filter(i => i.status === 'in_progress').length;
    const totalPoints = activeCycleIssues.reduce((sum, i) => sum + (i.estimate || 0), 0);
    const completedPoints = activeCycleIssues
      .filter(i => i.status === 'done')
      .reduce((sum, i) => sum + (i.estimate || 0), 0);
    const daysLeft = differenceInDays(activeCycle.endDate, new Date());
    const totalDays = differenceInDays(activeCycle.endDate, activeCycle.startDate);
    const daysElapsed = totalDays - daysLeft;
    const expectedProgress = totalDays > 0 ? (daysElapsed / totalDays) * 100 : 0;
    const actualProgress = total > 0 ? (completed / total) * 100 : 0;
    
    return {
      total,
      completed,
      inProgress,
      totalPoints,
      completedPoints,
      daysLeft,
      progress: Math.round(actualProgress),
      expectedProgress: Math.round(expectedProgress),
      velocity: completedPoints,
      isOnTrack: actualProgress >= expectedProgress - 10,
    };
  }, [activeCycle, activeCycleIssues]);
  
  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      <div className="flex items-center gap-2">
        <BarChart3 className="h-5 w-5" />
        <h1 className="text-xl font-semibold">Insights</h1>
      </div>
      
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Layers className="h-4 w-4" />
              Total Issues
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.completedThisWeek} completed this week
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Completion Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.completionRate}%</div>
            <Progress value={stats.completionRate} className="h-1.5 mt-2" />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Avg. Cycle Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.avgDaysToComplete}</div>
            <p className="text-xs text-muted-foreground mt-1">days to complete</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              At Risk
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-destructive">{stats.overdueCount}</div>
            <p className="text-xs text-muted-foreground mt-1">urgent issues aging</p>
          </CardContent>
        </Card>
      </div>
      
      {/* Active Cycle Summary */}
      {cycleStats && activeCycle && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              {activeCycle.name}
              <span className="text-sm font-normal text-muted-foreground ml-auto">
                {cycleStats.daysLeft} days remaining
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className={cycleStats.isOnTrack ? 'text-green-500' : 'text-amber-500'}>
                {cycleStats.progress}% ({cycleStats.isOnTrack ? 'On track' : 'Behind schedule'})
              </span>
            </div>
            <Progress value={cycleStats.progress} className="h-2" />
            
            <div className="grid grid-cols-3 gap-4 pt-2">
              <div className="text-center">
                <div className="text-2xl font-semibold">{cycleStats.completed}</div>
                <div className="text-xs text-muted-foreground">Completed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-semibold">{cycleStats.inProgress}</div>
                <div className="text-xs text-muted-foreground">In Progress</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-semibold">{cycleStats.velocity}</div>
                <div className="text-xs text-muted-foreground">Points Done</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Issues by Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Issues by Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(Object.entries(stats.byStatus) as [IssueStatus, number][]).map(([status, count]) => (
              <div key={status} className="flex items-center gap-3">
                <StatusIcon status={status} />
                <span className="text-sm flex-1">{STATUS_CONFIG[status].label}</span>
                <span className="text-sm font-medium">{count}</span>
                <div className="w-24">
                  <Progress 
                    value={stats.total > 0 ? (count / stats.total) * 100 : 0} 
                    className="h-1.5" 
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
        
        {/* Issues by Priority */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Issues by Priority</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(PRIORITY_CONFIG).map(([priority, config]) => {
              const count = stats.byPriority[priority] || 0;
              return (
                <div key={priority} className="flex items-center gap-3">
                  <PriorityIcon priority={priority as any} />
                  <span className="text-sm flex-1">{config.label}</span>
                  <span className="text-sm font-medium">{count}</span>
                  <div className="w-24">
                    <Progress 
                      value={stats.total > 0 ? (count / stats.total) * 100 : 0} 
                      className="h-1.5" 
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
        
        {/* Issues by Project */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Issues by Project</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {projects.map((project) => {
              const count = stats.byProject[project.id] || 0;
              return (
                <div key={project.id} className="flex items-center gap-3">
                  <span>{project.icon}</span>
                  <span className="text-sm flex-1">{project.name}</span>
                  <span className="text-sm font-medium">{count}</span>
                  <div className="w-24">
                    <Progress 
                      value={stats.total > 0 ? (count / stats.total) * 100 : 0} 
                      className="h-1.5" 
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
        
        {/* Issues by Assignee */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Workload by Assignee
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(stats.byAssignee).map(([assignee, count]) => (
              <div key={assignee} className="flex items-center gap-3">
                <div className="h-6 w-6 bg-primary/20 text-primary text-[10px] font-medium flex items-center justify-center">
                  {assignee.split(' ').map(n => n[0]).join('')}
                </div>
                <span className="text-sm flex-1">{assignee}</span>
                <span className="text-sm font-medium">{count}</span>
                <div className="w-24">
                  <Progress 
                    value={stats.total > 0 ? (count / stats.total) * 100 : 0} 
                    className="h-1.5" 
                  />
                </div>
              </div>
            ))}
            {Object.keys(stats.byAssignee).length === 0 && (
              <p className="text-sm text-muted-foreground">No assigned issues</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}