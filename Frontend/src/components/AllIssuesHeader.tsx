import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MagnifyingGlass, List, Kanban, Plus, Funnel } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useIssueStore } from '@/store/issueStore';
import { useSearchParams } from 'react-router-dom';
import { useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';

interface AllIssuesHeaderProps {
  onCreateIssue: () => void;
  onOpenCommandPalette: () => void;
}

export function AllIssuesHeader({ onCreateIssue, onOpenCommandPalette }: AllIssuesHeaderProps) {
  const [searchParams] = useSearchParams();
  const teamId = searchParams.get('team');
  const { teams } = useAuth();
  
  const { 
    viewMode, 
    setViewMode, 
    searchQuery,
    setSearchQuery 
  } = useIssueStore();

  const selectedTeam = useMemo(() => teams.find(t => t.id === teamId), [teams, teamId]);
  
  return (
    <div className="flex items-center justify-between px-6 h-14 border-b border-border bg-background shrink-0">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold tracking-tight">Issues</h1>
          {selectedTeam && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-muted border border-border text-[10px] uppercase font-bold text-muted-foreground">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              {selectedTeam.name}
            </div>
          )}
        </div>
        <div className="h-4 w-[1px] bg-border" />
        <div className="relative group">
          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
          <Input 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search issues..." 
            className="h-8 w-64 bg-muted border-none pl-9 text-xs focus-visible:ring-1 focus-visible:ring-primary/50"
          />
        </div>
        <div className="h-4 w-[1px] bg-border" />
        <div className="flex bg-muted p-1 rounded-lg gap-1">
          <Button 
            variant="ghost" 
            size="icon" 
            className={cn("h-7 w-7 rounded-md", viewMode === 'list' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground")}
            onClick={() => setViewMode('list')}
          >
            <List size={16} />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className={cn("h-7 w-7 rounded-md", viewMode === 'board' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground")}
            onClick={() => setViewMode('board')}
          >
            <Kanban size={16} />
          </Button>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" className="h-8 gap-2 text-muted-foreground hover:text-foreground hover:bg-muted">
          <Funnel className="h-4 w-4" />
          Filter
        </Button>
        <Button 
          variant="ghost"
          size="sm" 
          className="h-9 gap-2 bg-primary/10 text-primary hover:bg-primary/20 transition-all rounded-lg px-4 border border-primary/20"
          onClick={onCreateIssue}
        >
          <Plus className="h-4 w-4" />
          <span className="font-semibold">New Issue</span>
        </Button>
      </div>
    </div>
  );
}
