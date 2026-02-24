import { useState, useEffect } from 'react';
import { 
  MagnifyingGlass, 
  FolderSimple, 
  CaretDown,
  CaretRight,
  Plus,
  User as UserIcon,
  DotsThree,
  Circle as CircleIcon,
  NotePencil,
  Buildings,
  Users,
  Target,
  SidebarSimple,
  Star,
  Layout,
  Diamond,
  Tray,
  Lock,
  Bell,
  Sliders,
  MagicWand
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useIssueStore } from '@/store/issueStore';
import { useNotificationStore } from '@/store/notificationStore';
import { useAuth } from '@/context/AuthContext';
import { hasTeamAccess, canManageTeam } from '@/lib/permissions';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface AppSidebarProps {
  onOpenCommandPalette: () => void;
  onOpenCreateDialog: () => void;
  onOpenCreateTeamDialog: () => void;
  isMobile?: boolean;
  closeMobileMenu?: () => void;
  onToggle?: () => void;
}

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  to?: string;
  onClick?: () => void;
  shortcut?: string;
  badge?: number;
  indent?: boolean;
  end?: boolean;
}

function NavItem({ icon, label, to, onClick, shortcut, badge, indent, end }: NavItemProps) {
  const location = useLocation();
  const content = (
    <>
      <span className="flex h-4 w-4 items-center justify-center shrink-0">{icon}</span>
      <span className="flex-1 text-left truncate">{label}</span>
      {badge !== undefined && badge > 0 && (
        <Badge variant="secondary" className="h-5 min-w-5 px-1.5 text-[10px] bg-white/10 hover:bg-white/10 border-0">{badge}</Badge>
      )}
      {shortcut && (
        <span className="text-[10px] text-muted-foreground/60">{shortcut}</span>
      )}
    </>
  );

  const getIsActive = () => {
    if (!to) return false;
    
    // Exact match for path and search params
    const currentPath = location.pathname + location.search;
    
    if (end) {
      return currentPath === to;
    }
    
    return currentPath.startsWith(to);
  };

  const active = getIsActive();

  const className = cn(
    'flex w-full items-center gap-2.5 px-2.5 py-2 text-sm rounded-lg transition-all duration-150',
    'hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
    active ? 'bg-white/10 text-foreground' : 'text-white/50',
    indent && 'pl-8'
  );

  if (to) {
    return (
      <NavLink to={to} className={className} end={end}>
        {content}
      </NavLink>
    );
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2.5 px-2 py-1.5 text-sm rounded-md transition-all duration-150',
        'hover:bg-white/5 text-muted-foreground',
        indent && 'pl-7'
      )}
    >
      {content}
    </button>
  );
}

export function AppSidebar({ 
  onOpenCommandPalette, 
  onOpenCreateDialog, 
  onOpenCreateTeamDialog,
  isMobile,
  closeMobileMenu,
  onToggle
}: AppSidebarProps) {

  const { 
    projects,
  } = useIssueStore();

  const { unreadCount, fetchNotifications } = useNotificationStore();

  const { user, organization, teams, logout } = useAuth();
  
  const navigate = useNavigate();

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);


  const [workspaceOpen, setWorkspaceOpen] = useState(true);
  const [favoritesOpen, setFavoritesOpen] = useState(true);
  const [teamsOpen, setTeamsOpen] = useState(true);
  const [openTeams, setOpenTeams] = useState<Record<string, boolean>>({});
  
  const toggleTeam = (teamId: string) => {
    setOpenTeams(prev => ({ ...prev, [teamId]: !prev[teamId] }));
  };
  
  const favoriteProjects = projects.filter(p => p.isFavorite);

  const handleNavClick = (path: string) => {
    navigate(path);
    if (closeMobileMenu) closeMobileMenu();
  };

  return (
    <div className={cn(
      "flex flex-col bg-sidebar/50 backdrop-blur-3xl border-white/5 shadow-2xl overflow-hidden",
      isMobile ? "w-full h-full border-r" : "w-[240px] border rounded-2xl my-4 ml-4 h-[calc(100vh-2rem)]"
    )}>
      {/* Workspace header */}
      <div className="flex h-12 items-center justify-between px-3 border-b border-white/5 shrink-0">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="flex items-center gap-2 group cursor-pointer hover:bg-white/5 p-1 rounded-md -ml-1 pr-2 transition-colors">
              <div className="flex h-6 w-6 items-center justify-center rounded bg-gradient-to-br from-primary to-primary/70 text-primary-foreground text-xs font-bold shadow-lg shadow-primary/20">
                {organization?.name.charAt(0).toUpperCase() || "O"}
              </div>
              <span className="font-medium text-sm truncate max-w-[100px]">{organization?.name || "Organization"}</span>
              <CaretDown weight="bold" className="h-3 w-3 text-muted-foreground opacity-50 group-hover:opacity-100 transition-opacity" />
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
              Correctly logged in as <span className="text-foreground font-medium">{user?.email}</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleNavClick('/settings')}>
              Settings
            </DropdownMenuItem>
            <DropdownMenuItem onClick={logout}>
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        
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
                  <MagnifyingGlass className="h-4 w-4" />
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
                  <NotePencil className="h-4 w-4" />
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
          icon={<Tray className="h-4 w-4" />}
          label="Inbox"
          to="/inbox"
          badge={unreadCount}
          onClick={closeMobileMenu}
        />
        <NavItem
          icon={<UserIcon className="h-4 w-4" />}
          label="My issues"
          to="/my-issues"
          onClick={closeMobileMenu}
        />

        {/* Organization Workspace section */}
        <Collapsible open={workspaceOpen} onOpenChange={setWorkspaceOpen} className="mt-4">
          <CollapsibleTrigger className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-semibold text-white/40 hover:text-white/60 w-full group transition-colors">
            <CaretDown className={cn('h-3 w-3 transition-transform text-white/30 group-hover:text-white/50', !workspaceOpen && '-rotate-90')} />
            <span>{organization?.name || "Workspace"}</span>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-1 space-y-0.5">
             <NavItem
              icon={<Layout className="h-4 w-4" />}
              label="All Issues"
              to="/all-issues"
              onClick={closeMobileMenu}
              end
            />
            <NavItem
              icon={<FolderSimple className="h-4 w-4" />}
              label="Projects"
              to="/projects"
              onClick={closeMobileMenu}
              end
            />
              <NavItem
                icon={<Diamond className="h-4 w-4" />}
                label="Features"
                              to="/features"
                              onClick={closeMobileMenu}
                              end
                            />
                          </CollapsibleContent>        </Collapsible>

        {/* Favorites section */}
        {favoriteProjects.length > 0 && (
          <Collapsible open={favoritesOpen} onOpenChange={setFavoritesOpen} className="mt-4">
            <CollapsibleTrigger className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-semibold text-white/40 hover:text-white/60 w-full group transition-colors">
              <CaretDown className={cn('h-3 w-3 transition-transform text-white/30 group-hover:text-white/50', !favoritesOpen && '-rotate-90')} />
              <span>Favorites</span>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-1 space-y-0.5">
              {favoriteProjects.map(project => (
                <NavItem
                  key={project.id}
                  icon={<span>{project.icon}</span>}
                  label={project.name}
                  to={`/projects/${project.id}`}
                  onClick={closeMobileMenu}
                />
              ))}
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Teams section */}
        <Collapsible open={teamsOpen} onOpenChange={setTeamsOpen} className="mt-4">
          <CollapsibleTrigger className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-semibold text-white/40 hover:text-white/60 w-full group transition-colors">
            <CaretDown className={cn('h-3 w-3 transition-transform text-white/30 group-hover:text-white/50', !teamsOpen && '-rotate-90')} />
            <span>Teams</span>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-1 space-y-1">
            {teams.map(team => (
                <Collapsible 
                  key={team.id} 
                  open={!!openTeams[team.id]} 
                  onOpenChange={() => toggleTeam(team.id)}
                >
                  <CollapsibleTrigger asChild>
                    <div 
                      className="flex items-center gap-2.5 px-2.5 py-2 text-sm text-white/50 hover:text-white w-full rounded-lg hover:bg-white/5 group cursor-pointer transition-colors"
                    >
                    <div className="flex h-5 w-5 items-center justify-center rounded bg-zinc-800 text-zinc-500 text-[10px] font-bold group-hover:bg-zinc-700 group-hover:text-zinc-400 transition-colors">
                      {team.identifier.charAt(0)}
                    </div>
                    <span className="flex-1 text-left truncate">{team.name}</span>
                    <div className="flex items-center gap-1.5">
                      {canManageTeam(user, team) && (
                        <button
                          role="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleNavClick(`/teams/${team.id}/settings`);
                          }}
                          className="p-1 hover:bg-white/10 rounded-md opacity-0 group-hover:opacity-100 transition-all text-white/30 hover:text-white cursor-pointer focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring"
                          aria-label="Team settings"
                        >
                          <Sliders className="h-3 w-3" />
                        </button>
                      )}
                      <CaretRight weight="bold" className={cn('h-3 w-3 transition-transform text-white/30', openTeams[team.id] && 'rotate-90')} />
                    </div>
                  </div>
                </CollapsibleTrigger>
                  <CollapsibleContent className="mt-0.5 space-y-0.5">
                    <NavItem
                      icon={<Layout className="h-4 w-4" />}
                      label="Issues"
                      indent
                      to={`/all-issues?team=${team.id}`}
                      onClick={closeMobileMenu}
                      end
                    />
                    <NavItem
                      icon={<FolderSimple className="h-4 w-4" />}
                      label="Projects"
                      indent
                      to={`/projects?team=${team.id}`}
                      onClick={closeMobileMenu}
                      end
                    />
                    <NavItem
                      icon={<Diamond className="h-4 w-4" />}
                      label="Features"
                      indent
                      to={`/features?team=${team.id}`}
                      onClick={closeMobileMenu}
                      end
                    />
                  </CollapsibleContent>
                </Collapsible>
              ))}
            
            <NavItem
              icon={<Plus className="h-4 w-4" />}
              label="Create Team"
              onClick={onOpenCreateTeamDialog}
            />
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Footer - User */}
      <div className="border-t border-white/5 p-3 shrink-0">
         <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary font-medium text-xs shrink-0">
                {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
              </div>
              <div className="flex flex-col overflow-hidden">
                <span className="text-sm font-medium truncate">{user?.fullName}</span>
                <span className="text-xs text-muted-foreground truncate uppercase tracking-wider font-semibold">
                  {user?.role || "Member"}
                </span>
              </div>
            </div>

            {onToggle && !isMobile && (
              <TooltipProvider delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 rounded-md hover:bg-white/10 text-muted-foreground hover:text-foreground ml-1"
                      onClick={onToggle}
                    >
                      <SidebarSimple className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">Hide sidebar ⌘\</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
         </div>
      </div>
    </div>
  );
}
