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
  BarChart3
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIssueStore } from '@/store/issueStore';
import { Button } from '@/components/ui/button';
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
}

function NavItem({ icon, label, active, onClick, shortcut }: NavItemProps) {
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
  const { projects, selectedProjectId, setSelectedProject } = useIssueStore();
  const [projectsOpen, setProjectsOpen] = useState(true);

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
          />
          <NavItem
            icon={<CircleDot className="h-4 w-4" />}
            label="My Issues"
          />
          <NavItem
            icon={<LayoutGrid className="h-4 w-4" />}
            label="All Issues"
            active={!selectedProjectId}
            onClick={() => setSelectedProject(null)}
          />
          <NavItem
            icon={<BarChart3 className="h-4 w-4" />}
            label="Insights"
          />
        </div>

        {/* Projects */}
        <Collapsible open={projectsOpen} onOpenChange={setProjectsOpen} className="mt-4">
          <div className="flex items-center justify-between px-3">
            <CollapsibleTrigger className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground">
              <ChevronDown className={cn('h-3 w-3 transition-transform', !projectsOpen && '-rotate-90')} />
              Projects
            </CollapsibleTrigger>
            <Button variant="ghost" size="icon" className="h-5 w-5">
              <Plus className="h-3 w-3" />
            </Button>
          </div>
          <CollapsibleContent>
            <div className="mt-1">
              {projects.map((project) => (
                <NavItem
                  key={project.id}
                  icon={<span>{project.icon}</span>}
                  label={project.name}
                  active={selectedProjectId === project.id}
                  onClick={() => setSelectedProject(project.id)}
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
        />
      </div>
    </div>
  );
}
