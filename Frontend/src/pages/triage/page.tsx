import { useIssueStore } from '@/store/issueStore';
import { IssueBar } from '@/components/IssueBar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Tray as TriageIcon, 
  MagnifyingGlass,
  List,
  Kanban,
  Funnel,
  Plus
} from '@phosphor-icons/react';
import { useOutletContext } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface MainLayoutContext {
  onCreateIssue: () => void;
  onOpenCommandPalette: () => void;
}

const TriagePage = () => {
  const { 
    getTriageIssues, 
    setSelectedIssue,
    projects,
    features,
    updateIssue,
    deleteIssue,
    orgMembers,
    viewMode,
    setViewMode,
    searchQuery,
    setSearchQuery
  } = useIssueStore();
  const { onCreateIssue } = useOutletContext<MainLayoutContext>();
  
  const triageIssues = getTriageIssues();
  
  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      <div className="flex items-center justify-between px-6 h-14 border-b border-border bg-background shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
              <TriageIcon className="h-4 w-4 text-orange-500" />
            </div>
            <h1 className="text-lg font-semibold tracking-tight">Triage</h1>
            {triageIssues.length > 0 && (
              <Badge variant="secondary" className="bg-orange-500/10 text-orange-500 border-orange-500/20 h-5 px-1.5">
                {triageIssues.length}
              </Badge>
            )}
          </div>
          <div className="h-4 w-[1px] bg-border" />
          <div className="relative group">
            <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
            <Input 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search triage..." 
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
      
      <IssueBar.List 
        issues={triageIssues} 
        projects={projects}
        features={features}
        orgMembers={orgMembers}
        onUpdateIssue={updateIssue}
        onDeleteIssue={deleteIssue}
        onSelectIssue={setSelectedIssue}
        onCreateIssue={onCreateIssue}
      />
    </div>
  );
};

export default TriagePage;
