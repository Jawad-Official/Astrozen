import {
  CaretDown,
  Check,
  Plus,
  Users,
  CalendarBlank,
  User as UserIcon,
  MagnifyingGlass,
  X,
  ChatTeardropText,
  Stack,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { PROJECT_STATUS_OPTIONS } from '@/lib/project-options';
import { PROJECT_PRIORITY_OPTIONS } from '@/lib/constants';
import { FEATURE_STATUS_CONFIG } from '@/components/FeatureWindow';
import { Project, ProjectStatus, ProjectPriority, ProjectUpdate as ProjectUpdateType } from '@/types/issue';
import { Feature } from '@/types/feature';
import { Team, User } from '@/types/auth';
import { OrgMember } from '@/services/users';

interface AssigneeStat {
  id: string;
  name: string;
  total: number;
  completed: number;
  percent: number;
}

export const ProjectPropertiesSidebar = ({
  project,
  currentStatus,
  currentPriority,
  leadName,
  orgMembers,
  teams,
  canManageProject,
  handleStatusChange,
  handlePriorityChange,
  handleLeadChange,
  handleToggleMember,
  handleToggleTeam,
  handleDateChange,
  memberSearch,
  setMemberSearch,
  projectFeatures,
  navigate,
  setSelectedFeatureId,
  projectIssues,
  completedIssues,
  progressPercent,
  assigneeStats,
  sortedUpdates,
  user,
  currentUser,
}: {
  project: Project;
  currentStatus: (typeof PROJECT_STATUS_OPTIONS)[number];
  currentPriority: (typeof PROJECT_PRIORITY_OPTIONS)[number];
  leadName: string | null;
  orgMembers: OrgMember[];
  teams: Team[];
  canManageProject: boolean;
  handleStatusChange: (status: ProjectStatus) => Promise<void>;
  handlePriorityChange: (priority: ProjectPriority) => Promise<void>;
  handleLeadChange: (lead: string) => Promise<void>;
  handleToggleMember: (memberId: string) => Promise<void>;
  handleToggleTeam: (teamId: string) => Promise<void>;
  handleDateChange: (field: 'startDate' | 'targetDate', date: Date | undefined) => Promise<void>;
  memberSearch: string;
  setMemberSearch: (value: string) => void;
  projectFeatures: Feature[];
  navigate: (path: string) => void;
  setSelectedFeatureId: (id: string | null) => void;
  projectIssues: unknown[];
  completedIssues: number;
  progressPercent: number;
  assigneeStats: AssigneeStat[];
  sortedUpdates: ProjectUpdateType[];
  user: User | null;
  currentUser: string | null;
}) => {
  return (
    <div className="w-72 border-l border-border flex flex-col bg-card/30 shrink-0">
      <div className="flex items-center justify-between px-4 h-10 border-b border-border bg-background">
        <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
          Properties
          <CaretDown className="h-3 w-3" />
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-background">
        {/* Status */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Status</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Badge variant="outline" className="gap-1.5 cursor-pointer hover:bg-accent">
                {currentStatus.icon}
                {currentStatus.label}
              </Badge>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-popover border-border">
              {PROJECT_STATUS_OPTIONS.map((opt) => (
                <DropdownMenuItem key={opt.value} onClick={() => handleStatusChange(opt.value)} className="gap-2">
                  {opt.icon}
                  {opt.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Priority</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Badge variant="outline" className={cn('h-6 px-2 text-[11px] font-bold uppercase border-border bg-muted cursor-pointer hover:bg-accent transition-colors', currentPriority.color)}>
                {currentPriority.label}
              </Badge>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-popover border-border">
              {PROJECT_PRIORITY_OPTIONS.map((opt) => (
                <DropdownMenuItem key={opt.value} onClick={() => handlePriorityChange(opt.value)} className={opt.color}>
                  {opt.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Lead */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Lead</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild disabled={!canManageProject}>
              <span className={cn(
                "flex items-center gap-1.5 cursor-pointer hover:text-foreground group",
                !canManageProject && "opacity-50 cursor-not-allowed"
              )}>
                {project.lead ? (
                  <>
                    <div className="h-5 w-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 text-[9px] font-bold border border-emerald-500/10 shadow-inner group-hover:scale-110 transition-transform">
                      {leadName && typeof leadName === 'string' ? leadName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() : '?'}
                    </div>
                    <span className="text-xs font-medium text-foreground/70 group-hover:text-foreground transition-colors">{leadName}</span>
                  </>
                ) : (
                  <>
                    <UserIcon className="h-3.5 w-3.5 text-muted-foreground/40" />
                    <span className="text-xs text-muted-foreground/40 hover:text-foreground transition-colors font-medium">Add lead...</span>
                  </>
                )}
              </span>
            </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-popover border-border w-56 p-1 shadow-2xl">
                <DropdownMenuItem key="no-lead" onClick={() => handleLeadChange('')} className="text-xs focus:bg-muted py-2">
                  <div className="flex items-center gap-2 text-muted-foreground/40">
                    <UserIcon className="h-3.5 w-3.5" />
                    No lead
                  </div>
                </DropdownMenuItem>
                <Separator className="bg-border my-1" />
                <div className="px-2 py-1.5 text-[10px] font-black text-muted-foreground/40 uppercase tracking-widest">Assign Lead</div>
                {orgMembers.map((member) => (
                  <DropdownMenuItem key={member.id} onClick={() => handleLeadChange(member.id)} className="text-xs focus:bg-muted py-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[10px] font-bold border border-primary/10 shadow-inner">
                        {member.first_name[0]}{member.last_name[0]}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-semibold text-foreground/80 truncate">{member.full_name}</span>
                        <span className="text-[10px] text-muted-foreground/60 truncate">{member.email}</span>
                      </div>
                      {member.id === project.lead && <Check className="h-3 w-3 ml-auto text-primary" weight="bold" />}
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Members */}
        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-muted-foreground/40 uppercase tracking-[0.15em] flex items-center gap-1.5">
              Members
            </span>
            {canManageProject && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 hover:bg-accent text-muted-foreground/40 hover:text-foreground transition-colors"
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent side="left" align="start" className="w-64 p-0 bg-popover border-border shadow-2xl overflow-hidden rounded-xl">
                  <div className="p-2 border-b border-border bg-muted/20">
                    <div className="relative group">
                      <MagnifyingGlass className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
                      <input
                        value={memberSearch}
                        onChange={(e) => setMemberSearch(e.target.value)}
                        placeholder="Search teammates..."
                        className="w-full h-8 bg-muted/50 border border-border rounded-md pl-8 pr-2 text-xs text-foreground/80 focus:outline-none focus:border-primary/30 transition-colors placeholder:text-muted-foreground/40 font-medium"
                        autoFocus
                      />
                    </div>
                  </div>
                  <div className="max-h-[280px] overflow-y-auto py-1 custom-scrollbar">
                    {orgMembers
                      .filter(member =>
                        member.full_name.toLowerCase().includes(memberSearch.toLowerCase()) ||
                        member.email.toLowerCase().includes(memberSearch.toLowerCase())
                      )
                      .map((member) => {
                        const isAssigned = (project.members || []).includes(member.id);
                        return (
                          <button
                            key={member.id}
                            onClick={() => handleToggleMember(member.id)}
                            className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-muted/50 transition-all text-left group"
                          >
                            <div className={cn(
                              "h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-bold border shadow-inner transition-all",
                              isAssigned
                                ? "bg-primary/20 border-primary/30 text-primary scale-105 shadow-[0_0_15px_rgba(var(--primary),0.2)]"
                                : "bg-muted/50 border-border text-muted-foreground/40 group-hover:bg-muted group-hover:text-foreground/60"
                            )}>
                              {member.first_name[0]}{member.last_name[0]}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-[11px] font-semibold text-foreground/80 truncate tracking-tight">{member.full_name}</div>
                              <div className="text-[10px] text-muted-foreground/60 truncate font-medium">{member.email}</div>
                            </div>
                            {isAssigned && (
                              <div className="h-4 w-4 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                                <Check weight="bold" className="h-2.5 w-2.5 text-primary" />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    {orgMembers.length === 0 && (
                      <div className="py-8 text-center text-[10px] text-muted-foreground/40 font-medium italic">
                        No organization members found
                      </div>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            )}
          </div>

          <div className="flex flex-wrap gap-1.5 min-h-[32px]">
            {project.members?.length > 0 ? (
              project.members.map((memberId) => {
                const m = orgMembers.find(member => member.id === memberId);
                if (!m) return null;
                return (
                  <TooltipProvider key={memberId} delayDuration={0}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="h-7 w-7 rounded-full bg-primary/5 border border-border flex items-center justify-center text-primary/60 text-[10px] font-bold shadow-inner cursor-default hover:scale-110 hover:bg-primary/10 hover:border-primary/20 hover:text-primary transition-all duration-300 ring-1 ring-transparent hover:ring-primary/10">
                          {m.first_name[0]}{m.last_name[0]}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-[10px] bg-popover border-border text-foreground font-medium px-2 py-1 shadow-2xl">
                        {m.full_name}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                );
              })
            ) : (
              <span className="text-[11px] text-muted-foreground/40 italic font-medium">No collaborators assigned</span>
            )}
          </div>
        </div>

        {/* Start date */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Start date</span>
          <Popover>
            <PopoverTrigger asChild>
              <span className="text-muted-foreground flex items-center gap-1.5 cursor-pointer hover:text-foreground">
                <CalendarBlank className="h-3.5 w-3.5" />
                {project.startDate ? format(new Date(project.startDate), 'MMM d, yyyy') : 'No date'}
              </span>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-popover border-border" align="end">
              <CalendarComponent
                mode="single"
                selected={project.startDate ? new Date(project.startDate) : undefined}
                onSelect={(date) => handleDateChange('startDate', date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Target date */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Target date</span>
          <Popover>
            <PopoverTrigger asChild>
              <span className="text-muted-foreground flex items-center gap-1.5 cursor-pointer hover:text-foreground">
                <CalendarBlank className="h-3.5 w-3.5" />
                {project.targetDate ? format(new Date(project.targetDate), 'MMM d, yyyy') : 'No date'}
              </span>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-popover border-border" align="end">
              <CalendarComponent
                mode="single"
                selected={project.targetDate ? new Date(project.targetDate) : undefined}
                onSelect={(date) => handleDateChange('targetDate', date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        <Separator className="bg-border" />

        {/* Teams */}
        <div className="text-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-muted-foreground">Teams</span>
            {canManageProject && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-5 w-5">
                    <Plus className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-popover border-border max-h-[300px] overflow-y-auto">
                  {teams.map((team) => (
                    <DropdownMenuItem
                      key={team.id}
                      onClick={() => handleToggleTeam(team.id)}
                      className="gap-2"
                    >
                      <Users className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="flex-1">{team.name} ({team.identifier})</span>
                      {project.teams?.includes(team.id) && <Check className="h-3 w-3 ml-auto text-primary" />}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
          {project.teams?.length > 0 ? (
            <div className="space-y-1">
              {project.teams.map((teamId) => {
                const t = teams.find(team => team.id === teamId);
                return (
                  <div key={teamId} className="flex items-center gap-2 group">
                    <div className="h-5 w-5 rounded bg-muted flex items-center justify-center text-[9px] font-bold text-muted-foreground">
                      {t?.identifier?.charAt(0) || '?'}
                    </div>
                    <span className="text-xs flex-1 truncate">
                      {project.teams.length > 1
                        ? (t?.identifier || t?.name || teamId)
                        : (t?.name || teamId)}
                    </span>
                    {canManageProject && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-4 w-4 opacity-0 group-hover:opacity-100 hover:text-destructive"
                        onClick={() => handleToggleTeam(teamId)}
                      >
                        <X className="h-2.5 w-2.5" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <span className="text-xs text-muted-foreground inline-block mb-1">No teams assigned</span>
          )}
        </div>

        <Separator className="bg-border" />

        {/* Features */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              Features
              <CaretDown className="h-3 w-3" />
            </span>
            <Plus className="h-3.5 w-3.5 text-muted-foreground cursor-pointer hover:text-foreground" onClick={() => navigate('/features')} />
          </div>
          {projectFeatures.length > 0 ? (
            <div className="space-y-1">
              {projectFeatures.slice(0, 5).map((feature) => (
                <div
                  key={feature.id}
                  className="flex items-center gap-2 py-1 px-2 -mx-2 rounded-md hover:bg-white/5 cursor-pointer group transition-colors"
                  onClick={() => setSelectedFeatureId(feature.id)}
                >
                  <Badge variant="outline" className={cn("h-4 px-1 text-[8px] font-bold uppercase border-white/5 bg-white/5", FEATURE_STATUS_CONFIG[feature.status].color)}>
                    {FEATURE_STATUS_CONFIG[feature.status].label}
                  </Badge>
                  <span className="text-xs flex-1 truncate text-muted-foreground group-hover:text-foreground">{feature.name}</span>
                </div>
              ))}
              {projectFeatures.length > 5 && (
                 <p className="text-[10px] text-muted-foreground mt-1 ml-6">+{projectFeatures.length - 5} more features</p>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground leading-relaxed">
              Add features to organize value delivery.
            </p>
          )}
        </div>

        <Separator className="bg-border" />

        {/* Progress */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              Progress
              <CaretDown className="h-3 w-3" />
            </span>
          </div>
          <div className="flex gap-8 text-xs mb-2">
            <div>
              <span className="text-muted-foreground flex items-center gap-1">
                <div className="h-2 w-2 rounded-sm bg-muted-foreground" />
                Scope
              </span>
              <p className="font-medium mt-1">{projectIssues.length}</p>
            </div>
            <div>
              <span className="text-emerald-400 flex items-center gap-1">
                <div className="h-2 w-2 rounded-sm bg-emerald-400" />
                Completed
              </span>
              <p className="font-medium mt-1">{completedIssues} · {progressPercent}%</p>
            </div>
          </div>
        </div>

        <Separator className="bg-border" />

        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              Assignees
              <CaretDown className="h-3 w-3" />
            </span>
          </div>
          <div className="space-y-2">
            {assigneeStats.length > 0 ? (
              assigneeStats.map((stat) => (
                <div key={stat.name} className="flex items-center gap-2">
                  {stat.name === 'Unassigned' ? (
                    <Users className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center text-primary text-[9px] font-medium">
                      {stat.name ? stat.name.split(' ').map(n => n[0]).join('').slice(0, 2) : '??'}
                    </div>
                  )}
                  <span className="text-xs flex-1">{stat.name}</span>
                  <span className="text-xs text-muted-foreground">{stat.percent}% of {stat.total}</span>
                </div>
              ))
            ) : (
              <div className="text-xs text-muted-foreground">No issues assigned</div>
            )}
          </div>
        </div>

        <Separator className="bg-border" />

        {/* Activity */}
        <div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              Activity
              <CaretDown className="h-3 w-3" />
            </span>
            <span className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">See all</span>
          </div>
          <div className="mt-3 space-y-2 text-xs text-muted-foreground">
            {sortedUpdates.slice(0, 2).map((update) => (
              <div key={update.id} className="flex items-start gap-2">
                <ChatTeardropText className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{update.authorName || update.author} posted an update · {format(new Date(update.createdAt), 'MMM d')}</span>
              </div>
            ))}
            <div className="flex items-start gap-2">
              <Stack className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>{user?.fullName || currentUser} created the project · {format(new Date(project.createdAt), 'MMM d')}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
