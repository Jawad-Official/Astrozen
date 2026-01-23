import { useState } from 'react';
import { 
  Inbox, 
  Search, 
  Folder, 
  Settings,
  ChevronDown,
  ChevronRight,
  Plus,
  BarChart3,
  Target,
  User,
  MoreHorizontal,
  Layers,
  PenSquare,
  Hash,
  CircleDot,
  Eye,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIssueStore } from '@/store/issueStore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
  shortcut?: string;
  badge?: number;
  indent?: boolean;
}

function NavItem({ icon, label, active, onClick, shortcut, badge, indent }: NavItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2.5 px-2 py-1.5 text-sm rounded-md transition-all duration-150',
        'hover:bg-white/5',
        active ? 'bg-white/10 text-foreground' : 'text-muted-foreground',
        indent && 'pl-7'
      )}
    >
      <span className="flex h-4 w-4 items-center justify-center shrink-0">{icon}</span>
      <span className="flex-1 text-left truncate">{label}</span>
      {badge !== undefined && badge > 0 && (
        <Badge variant="secondary" className="h-5 min-w-5 px-1.5 text-[10px] bg-white/10 hover:bg-white/10 border-0">{badge}</Badge>
      )}
      {shortcut && (
        <span className="text-[10px] text-muted-foreground/60">{shortcut}</span>
      )}
    </button>
  );
}

interface AppSidebarProps {
  onOpenCommandPalette: () => void;
  onOpenCreateDialog: () => void;
}

export function AppSidebar({ onOpenCommandPalette, onOpenCreateDialog }: AppSidebarProps) {
  const { 
    projects, 
    cycles,
    customViews,
    selectedProjectId, 
    setSelectedProject, 
    currentView,
    setCurrentView,
    getTriageIssues,
    setSelectedCycle,
    setSelectedCustomView,
  } = useIssueStore();
  
  const [workspaceOpen, setWorkspaceOpen] = useState(true);
  const [teamsOpen, setTeamsOpen] = useState(true);
  const [teamProjectsOpen, setTeamProjectsOpen] = useState(false);
  
  const triageCount = getTriageIssues().length;
  const activeCycles = cycles.filter(c => c.status === 'active' || c.status === 'upcoming');
  const personalViews = customViews.filter(v => v.visibility === 'personal');

  return (
    <div className="flex h-full w-[220px] flex-col bg-sidebar/50 backdrop-blur-xl border-r border-white/5">
      {/* Workspace header */}
      <div className="flex h-12 items-center justify-between px-3 border-b border-white/5">
        <div className="flex items-center gap-2 group cursor-pointer">
          <div className="flex h-6 w-6 items-center justify-center rounded bg-gradient-to-br from-primary to-primary/70 text-primary-foreground text-xs font-bold shadow-lg shadow-primary/20">
            J
          </div>
          <span className="font-medium text-sm">Jawad</span>
          <ChevronDown className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        
        <div className="flex items-center gap-0.5">
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-md hover:bg-white/10 text-muted-foreground hover:text-foreground"
                  onClick={onOpenCommandPalette}
                >
                  <Search className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">Search ⌘K</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-md hover:bg-white/10 text-muted-foreground hover:text-foreground"
                  onClick={onOpenCreateDialog}
                >
                  <PenSquare className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">New issue C</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-2 px-2 scrollbar-thin space-y-1">
        {/* Main nav items */}
        <NavItem
          icon={<Inbox className="h-4 w-4" />}
          label="Inbox"
          active={currentView === 'inbox'}
          onClick={() => setCurrentView('inbox')}
          badge={triageCount}
        />
        <NavItem
          icon={<User className="h-4 w-4" />}
          label="My issues"
          active={currentView === 'my-issues'}
          onClick={() => setCurrentView('my-issues')}
        />

        {/* Workspace section */}
        <Collapsible open={workspaceOpen} onOpenChange={setWorkspaceOpen} className="mt-4">
          <CollapsibleTrigger className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-muted-foreground/70 hover:text-muted-foreground w-full">
            <ChevronDown className={cn('h-3 w-3 transition-transform', !workspaceOpen && '-rotate-90')} />
            <span>Workspace</span>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-1 space-y-0.5">
            <NavItem
              icon={<Folder className="h-4 w-4" />}
              label="Projects"
              active={currentView === 'projects'}
              onClick={() => setCurrentView('projects')}
            />
            <NavItem
              icon={<Eye className="h-4 w-4" />}
              label="Views"
              active={currentView === 'views'}
              onClick={() => setCurrentView('views')}
            />
            <NavItem
              icon={<MoreHorizontal className="h-4 w-4" />}
              label="More"
              onClick={() => {}}
            />
          </CollapsibleContent>
        </Collapsible>

        {/* Your teams section */}
        <Collapsible open={teamsOpen} onOpenChange={setTeamsOpen} className="mt-4">
          <CollapsibleTrigger className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-muted-foreground/70 hover:text-muted-foreground w-full">
            <ChevronDown className={cn('h-3 w-3 transition-transform', !teamsOpen && '-rotate-90')} />
            <span>Your teams</span>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-1">
            {/* Team item */}
            <Collapsible open={teamProjectsOpen} onOpenChange={setTeamProjectsOpen}>
              <CollapsibleTrigger className="flex items-center gap-2 px-2 py-1.5 text-sm text-muted-foreground hover:text-foreground w-full rounded-md hover:bg-white/5">
                <div className="flex h-5 w-5 items-center justify-center rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                  J
                </div>
                <span className="flex-1 text-left">Jawad</span>
                <ChevronRight className={cn('h-3 w-3 transition-transform', teamProjectsOpen && 'rotate-90')} />
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-0.5 space-y-0.5">
                <NavItem
                  icon={<CircleDot className="h-4 w-4" />}
                  label="Issues"
                  indent
                  active={currentView === 'all' && !selectedProjectId}
                  onClick={() => { setCurrentView('all'); setSelectedProject(null); }}
                />
                <NavItem
                  icon={<Folder className="h-4 w-4" />}
                  label="Projects"
                  indent
                  active={currentView === 'projects'}
                  onClick={() => setCurrentView('projects')}
                />
                <NavItem
                  icon={<Eye className="h-4 w-4" />}
                  label="Views"
                  indent
                  active={currentView === 'views'}
                  onClick={() => setCurrentView('views')}
                />
              </CollapsibleContent>
            </Collapsible>
          </CollapsibleContent>
        </Collapsible>

        {/* Try section */}
        <div className="mt-4">
          <div className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-muted-foreground/70">
            <ChevronDown className="h-3 w-3" />
            <span>Try</span>
          </div>
          <div className="mt-1 space-y-0.5">
            <NavItem
              icon={<Inbox className="h-4 w-4" />}
              label="Import issues"
              onClick={() => {}}
            />
            <NavItem
              icon={<Plus className="h-4 w-4" />}
              label="Invite people"
              onClick={() => {}}
            />
          </div>
        </div>
      </div>

      {/* Footer - What's new */}
      <div className="border-t border-white/5 p-3">
        <div className="bg-white/5 rounded-lg p-3">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">What's new</p>
          <p className="text-xs font-medium mt-1">Customizable Linear</p>
          <p className="text-xs text-muted-foreground">Mobile navigation</p>
        </div>
      </div>
    </div>
  );
}