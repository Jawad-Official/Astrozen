import { useMemo } from 'react';
import { useIssueStore } from '@/store/issueStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { 
  ChartBar as BarChart3, 
  TrendUp as TrendingUp, 
  Clock, 
  WarningCircle as AlertCircle,
  Users,
  Stack as Layers,
} from '@phosphor-icons/react';
import { STATUS_CONFIG, PRIORITY_CONFIG, IssueStatus } from '@/types/issue';
import { IssueBar } from '@/components/IssueBar';
import { differenceInDays, subDays } from 'date-fns';

const InsightsPage = () => {
  const { issues, projects, features } = useIssueStore();
  
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
      
      const feature = features.find(f => f.id === issue.featureId);
      if (feature && feature.projectId) {
        byProject[feature.projectId] = (byProject[feature.projectId] || 0) + 1;
      }
      
      if (issue.assignee) {
        byAssignee[issue.assignee] = (byAssignee[issue.assignee] || 0) + 1;
      }
    });
    
    const oneWeekAgo = subDays(new Date(), 7);
    const completedThisWeek = issues.filter(
      i => i.status === 'done' && new Date(i.updatedAt) >= oneWeekAgo
    ).length;
    
    const completedIssues = issues.filter(i => i.status === 'done');
    const avgDaysToComplete = completedIssues.length > 0
      ? completedIssues.reduce((sum, i) => sum + differenceInDays(new Date(i.updatedAt), new Date(i.createdAt)), 0) / completedIssues.length
      : 0;
    
    const overdueCount = issues.filter(i => 
      i.status === 'in_progress' && 
      i.priority === 'urgent' && 
      differenceInDays(new Date(), new Date(i.createdAt)) > 7
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
  
  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-background">
      <div className="flex items-center gap-2">
        <BarChart3 className="h-5 w-5" />
        <h1 className="text-xl font-semibold">Insights</h1>
      </div>
      
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
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Issues by Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(Object.entries(stats.byStatus) as [IssueStatus, number][]).map(([status, count]) => (
              <div key={status} className="flex items-center gap-3">
                <Badge variant="outline" className="h-5 px-1.5 text-[9px] font-bold uppercase border-white/5 bg-white/5 text-white/60">
                  {STATUS_CONFIG[status].label}
                </Badge>
                <span className="text-sm flex-1"></span>
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
        
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Issues by Priority</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(PRIORITY_CONFIG).map(([priority, config]) => {
              const count = stats.byPriority[priority] || 0;
              return (
                <div key={priority} className="flex items-center gap-3">
                  <div className="flex items-center gap-2 flex-1">
                    <IssueBar.PriorityIcon priority={priority} />
                    <span className={cn("text-[10px] font-bold uppercase", config.color)}>
                      {config.label}
                    </span>
                  </div>
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
};

export default InsightsPage;
