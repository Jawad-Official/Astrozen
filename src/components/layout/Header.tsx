import { useIssueStore } from '@/store/issueStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LayoutList, LayoutGrid, Plus, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HeaderProps {
  onCreateIssue: () => void;
  onOpenCommandPalette: () => void;
}

export function Header({ onCreateIssue, onOpenCommandPalette }: HeaderProps) {
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
    <header className="flex h-12 items-center justify-between border-b border-border px-4 bg-background">
      <div className="flex items-center gap-4">
        <h1 className="text-sm font-medium">{title}</h1>
      </div>

      <div className="flex items-center gap-2">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search... (⌘K)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onClick={onOpenCommandPalette}
            className="w-48 pl-8 h-8 text-sm"
            readOnly
          />
        </div>

        {/* View toggle */}
        <div className="flex items-center border border-border">
          <button
            onClick={() => setViewMode('list')}
            className={cn(
              'flex h-8 w-8 items-center justify-center transition-colors',
              viewMode === 'list' ? 'bg-accent text-foreground' : 'text-muted-foreground hover:bg-accent/50'
            )}
          >
            <LayoutList className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode('board')}
            className={cn(
              'flex h-8 w-8 items-center justify-center transition-colors',
              viewMode === 'board' ? 'bg-accent text-foreground' : 'text-muted-foreground hover:bg-accent/50'
            )}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
        </div>

        {/* Create issue */}
        <Button onClick={onCreateIssue} size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          New Issue
        </Button>
      </div>
    </header>
  );
}
