import { useState } from 'react';
import { 
  LayoutGrid, 
  Inbox, 
  Search, 
  CircleDot, 
  Folder, 
  Settings,
  ChevronDown,
  Plus,
  BarChart3,
  Target,
  User,
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

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
  shortcut?: string;
  badge?: number;
}

function NavItem({ icon, label, active, onClick, shortcut, badge }: NavItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 px-3 py-1.5 text-sm transition-colors',
        'hover:bg-accent',
        active ? 'bg-accent text-foreground' : 'text-muted-foreground'
      )}
    >
      <span className="flex h-4 w-4 items-center justify-center">{icon}</span>
      <span className="flex-1 text-left">{label}</span>
      {badge !== undefined && badge > 0 && (
        <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">{badge}</Badge>
      )}
      {shortcut && (
        <span className="text-xs text-muted-foreground">{shortcut}</span>
      )}
    </button>
  );
}

interface AppSidebarProps {
  onOpenCommandPalette: () => void;
}

export function AppSidebar({ onOpenCommandPalette }: AppSidebarProps) {
  const { 
    projects, 
    cycles,
    selectedProjectId, 
    setSelectedProject, 
    currentView,
    setCurrentView,
    getTriageIssues,
    setSelectedCycle,
  } = useIssueStore();
  const [projectsOpen, setProjectsOpen] = useState(true);
  const [cyclesOpen, setCyclesOpen] = useState(true);
  
  const triageCount = getTriageIssues().length;
  const activeCycles = cycles.filter(c => c.status === 'active' || c.status === 'upcoming');

  return (
    <div className="flex h-full w-56 flex-col border-r border-border bg-sidebar">
      {/* Workspace header */}
      <div className="flex h-12 items-center justify-between border-b border-border px-3">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center bg-primary text-primary-foreground text-xs font-semibold">
            L
          </div>
          <span className="font-medium text-sm">Linear Clone</span>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-2 scrollbar-thin">
        {/* Search */}
        <NavItem
          icon={<Search className="h-4 w-4" />}
          label="Search"
          onClick={onOpenCommandPalette}
          shortcut="⌘K"
        />

        {/* Main nav */}
        <div className="mt-4 px-3">
          <span className="text-xs font-medium text-muted-foreground">Workspace</span>
        </div>
        <div className="mt-1">
          <NavItem
            icon={<Inbox className="h-4 w-4" />}
            label="Inbox"
            active={currentView === 'inbox'}
            onClick={() => setCurrentView('inbox')}
            badge={triageCount}
          />
          <NavItem
            icon={<User className="h-4 w-4" />}
            label="My Issues"
            active={currentView === 'my-issues'}
            onClick={() => setCurrentView('my-issues')}
          />
          <NavItem
            icon={<LayoutGrid className="h-4 w-4" />}
            label="All Issues"
            active={currentView === 'all' && !selectedProjectId}
            onClick={() => { setCurrentView('all'); setSelectedProject(null); }}
          />
          <NavItem
            icon={<BarChart3 className="h-4 w-4" />}
            label="Insights"
            active={currentView === 'insights'}
            onClick={() => setCurrentView('insights')}
          />
        </div>

        {/* Cycles */}
        <Collapsible open={cyclesOpen} onOpenChange={setCyclesOpen} className="mt-4">
          <div className="flex items-center justify-between px-3">
            <CollapsibleTrigger className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground">
              <ChevronDown className={cn('h-3 w-3 transition-transform', !cyclesOpen && '-rotate-90')} />
              Cycles
            </CollapsibleTrigger>
          </div>
          <CollapsibleContent>
            <div className="mt-1">
              {activeCycles.map((cycle) => (
                <NavItem
                  key={cycle.id}
                  icon={<Target className="h-4 w-4" />}
                  label={cycle.name}
                  active={currentView === 'cycle' && cycle.id === useIssueStore.getState().selectedCycleId}
                  onClick={() => { setSelectedCycle(cycle.id); setCurrentView('cycle'); }}
                />
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Projects */}
        <Collapsible open={projectsOpen} onOpenChange={setProjectsOpen} className="mt-4">
          <div className="flex items-center justify-between px-3">
            <CollapsibleTrigger className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground">
              <ChevronDown className={cn('h-3 w-3 transition-transform', !projectsOpen && '-rotate-90')} />
              Projects
            </CollapsibleTrigger>
          </div>
          <CollapsibleContent>
            <div className="mt-1">
              {projects.map((project) => (
                <NavItem
                  key={project.id}
                  icon={<span>{project.icon}</span>}
                  label={project.name}
                  active={currentView === 'all' && selectedProjectId === project.id}
                  onClick={() => { setCurrentView('all'); setSelectedProject(project.id); }}
                />
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Footer */}
      <div className="border-t border-border p-2">
        <NavItem
          icon={<Settings className="h-4 w-4" />}
          label="Settings"
          active={currentView === 'settings'}
          onClick={() => setCurrentView('settings')}
        />
      </div>
    </div>
  );
}