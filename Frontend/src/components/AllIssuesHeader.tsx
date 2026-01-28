import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MagnifyingGlass, List, Columns, Plus } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useIssueStore } from '@/store/issueStore';

interface AllIssuesHeaderProps {
  onCreateIssue: () => void;
  onOpenCommandPalette: () => void;
}

export function AllIssuesHeader({ onCreateIssue, onOpenCommandPalette }: AllIssuesHeaderProps) {
  const { 
    viewMode, 
    setViewMode, 
    selectedProjectId, 
    projects,
    searchQuery,
    setSearchQuery 
  } = useIssueStore();
  
  const selectedProject = projects.find((p) => p.id === selectedProjectId);
  const title = selectedProject ? `${selectedProject.icon} ${selectedProject.name}` : 'All Issues';

  return (
    <header className="flex h-12 items-center justify-between border-b border-border px-4 bg-background shrink-0">
      <div className="flex items-center gap-4">
        <h1 className="text-sm font-medium">{title}</h1>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative">
          <MagnifyingGlass className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search... (⌘K)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onClick={onOpenCommandPalette}
            className="w-48 pl-8 h-8 text-sm"
            readOnly
          />
        </div>

        <div className="flex items-center border border-border">
          <button
            onClick={() => setViewMode('list')}
            className={cn(
              'flex h-8 w-8 items-center justify-center transition-colors',
              viewMode === 'list' ? 'bg-accent text-foreground' : 'text-muted-foreground hover:bg-accent/50'
            )}
          >
            <List className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode('board')}
            className={cn(
              'flex h-8 w-8 items-center justify-center transition-colors',
              viewMode === 'board' ? 'bg-accent text-foreground' : 'text-muted-foreground hover:bg-accent/50'
            )}
          >
            <Columns className="h-4 w-4" />
          </button>
        </div>

        <Button 
          onClick={onCreateIssue} 
          size="sm" 
          className="h-8 gap-2 bg-primary/10 text-primary hover:bg-primary/20 transition-all rounded-lg px-4 border border-primary/20"
        >
          <Plus className="h-4 w-4" />
          <span className="font-semibold">New Issue</span>
        </Button>
      </div>
    </header>
  );
}
