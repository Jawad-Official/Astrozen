import { useState } from 'react';
import { useIssueStore } from '@/store/issueStore';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { format, differenceInDays, isAfter, isBefore } from 'date-fns';
import { Plus, Calendar, Target, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CreateCycleDialog } from './CreateCycleDialog';

export function CycleList() {
  const { cycles, getCycleIssues, setCurrentView, setSelectedCycle } = useIssueStore();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  
  const handleCycleClick = (cycleId: string) => {
    setSelectedCycle(cycleId);
    setCurrentView('cycle');
  };
  
  const getCycleProgress = (cycleId: string) => {
    const issues = getCycleIssues(cycleId);
    if (issues.length === 0) return 0;
    const completed = issues.filter(i => i.status === 'done').length;
    return Math.round((completed / issues.length) * 100);
  };
  
  const getCycleStats = (cycleId: string) => {
    const issues = getCycleIssues(cycleId);
    const completed = issues.filter(i => i.status === 'done').length;
    const inProgress = issues.filter(i => i.status === 'in_progress').length;
    const todo = issues.filter(i => ['todo', 'backlog'].includes(i.status)).length;
    return { total: issues.length, completed, inProgress, todo };
  };
  
  const activeCycles = cycles.filter(c => c.status === 'active');
  const upcomingCycles = cycles.filter(c => c.status === 'upcoming');
  const completedCycles = cycles.filter(c => c.status === 'completed');
  
  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Cycles</h1>
        <Button onClick={() => setCreateDialogOpen(true)} size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          New Cycle
        </Button>
      </div>
      
      {/* Active Cycles */}
      {activeCycles.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">Active</h2>
          {activeCycles.map((cycle) => {
            const progress = getCycleProgress(cycle.id);
            const stats = getCycleStats(cycle.id);
            const daysLeft = differenceInDays(cycle.endDate, new Date());
            
            return (
              <button
                key={cycle.id}
                onClick={() => handleCycleClick(cycle.id)}
                className="w-full bg-card border border-border p-4 hover:bg-accent/30 transition-colors text-left"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-primary" />
                    <span className="font-medium">{cycle.name}</span>
                    <Badge variant="secondary" className="text-xs">Active</Badge>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
                
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>{format(cycle.startDate, 'MMM d')} - {format(cycle.endDate, 'MMM d')}</span>
                  </div>
                  <span className={cn(daysLeft <= 2 ? 'text-destructive' : '')}>
                    {daysLeft > 0 ? `${daysLeft} days left` : 'Ends today'}
                  </span>
                </div>
                
                <div className="space-y-2">
                  <Progress value={progress} className="h-1.5" />
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>{stats.completed} completed</span>
                    <span>{stats.inProgress} in progress</span>
                    <span>{stats.todo} remaining</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
      
      {/* Upcoming Cycles */}
      {upcomingCycles.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">Upcoming</h2>
          {upcomingCycles.map((cycle) => {
            const stats = getCycleStats(cycle.id);
            const daysUntil = differenceInDays(cycle.startDate, new Date());
            
            return (
              <button
                key={cycle.id}
                onClick={() => handleCycleClick(cycle.id)}
                className="w-full bg-card border border-border p-4 hover:bg-accent/30 transition-colors text-left"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{cycle.name}</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
                
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>{format(cycle.startDate, 'MMM d')} - {format(cycle.endDate, 'MMM d')}</span>
                  </div>
                  <span>Starts in {daysUntil} days</span>
                  <span>{stats.total} issues planned</span>
                </div>
              </button>
            );
          })}
        </div>
      )}
      
      {/* Completed Cycles */}
      {completedCycles.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">Completed</h2>
          {completedCycles.map((cycle) => {
            const progress = getCycleProgress(cycle.id);
            const stats = getCycleStats(cycle.id);
            
            return (
              <button
                key={cycle.id}
                onClick={() => handleCycleClick(cycle.id)}
                className="w-full bg-card border border-border p-4 hover:bg-accent/30 transition-colors text-left opacity-70"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{cycle.name}</span>
                    <Badge variant="outline" className="text-xs">Completed</Badge>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
                
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>{format(cycle.startDate, 'MMM d')} - {format(cycle.endDate, 'MMM d')}</span>
                  <span>{stats.completed}/{stats.total} completed ({progress}%)</span>
                </div>
              </button>
            );
          })}
        </div>
      )}
      
      {cycles.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">No cycles yet</p>
          <p className="text-sm mt-1">Create your first cycle to start planning sprints</p>
          <Button onClick={() => setCreateDialogOpen(true)} className="mt-4" size="sm">
            <Plus className="h-4 w-4 mr-1.5" />
            Create Cycle
          </Button>
        </div>
      )}
      
      <CreateCycleDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />
    </div>
  );
}