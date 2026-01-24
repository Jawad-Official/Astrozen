import { useState, useMemo } from 'react';
import { useIssueStore } from '@/store/issueStore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { 
  ChevronRight, 
  ChevronDown,
  MoreHorizontal, 
  Star, 
  Link2,
  MessageSquare,
  Plus,
  Users,
  Calendar,
  Tag,
  PenSquare,
  CircleDot,
  Settings2,
  Check,
  AlertCircle,
  Circle,
  Layers,
  Diamond,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Separator } from '@/components/ui/separator';
import { StatusIcon } from '@/components/issues/StatusIcon';
import { PriorityIcon } from '@/components/issues/PriorityIcon';
import { IssueStatus } from '@/types/issue';

const statusOptions = [
  { value: 'backlog', label: 'Backlog' },
  { value: 'planned', label: 'Planned' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'paused', label: 'Paused' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const priorityOptions = [
  { value: 'urgent', label: 'Urgent' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
  { value: 'none', label: 'No priority' },
];

const healthBadges = {
  on_track: { label: 'On track', icon: Check, className: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  at_risk: { label: 'At risk', icon: AlertCircle, className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  off_track: { label: 'Off track', icon: AlertCircle, className: 'bg-red-500/20 text-red-400 border-red-500/30' },
  no_updates: { label: 'No updates', icon: Circle, className: 'bg-muted text-muted-foreground border-border' },
};

interface StatusGroupProps {
  status: IssueStatus;
  label: string;
  issues: ReturnType<typeof useIssueStore.getState>['issues'];
  onIssueClick: (id: string) => void;
  defaultExpanded?: boolean;
}

function StatusGroup({ status, label, issues, onIssueClick, defaultExpanded = true }: StatusGroupProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const statusIssues = issues.filter(i => i.status === status);
  
  if (statusIssues.length === 0) return null;
  
  return (
    <div className="mb-1">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 px-2 py-1.5 text-sm text-muted-foreground hover:text-foreground w-full group"
      >
        <ChevronRight className={cn('h-3.5 w-3.5 transition-transform', expanded && 'rotate-90')} />
        <StatusIcon status={status} />
        <span className="font-medium">{label}</span>
        <span className="text-xs">{statusIssues.length}</span>
        <div className="flex-1" />
        <Plus className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
      </button>
      
      {expanded && (
        <div className="ml-5 border-l border-border/50">
          {statusIssues.map(issue => (
            <div
              key={issue.id}
              onClick={() => onIssueClick(issue.id)}
              className="flex items-center gap-3 px-3 py-2 hover:bg-accent/50 cursor-pointer ml-2 group"
            >
              <span className="text-xs text-muted-foreground font-mono">{issue.identifier}</span>
              <StatusIcon status={issue.status} />
              <span className="text-sm flex-1 truncate">{issue.title}</span>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {format(issue.createdAt, 'MMM d')}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface ProjectUpdateProps {
  health: keyof typeof healthBadges;
  author: string;
  date: Date;
  content: string;
}

function ProjectUpdate({ health, author, date, content }: ProjectUpdateProps) {
  const healthBadge = healthBadges[health];
  const HealthIcon = healthBadge.icon;
  
  return (
    <div className="bg-card/50 rounded-lg border border-border p-4">
      <div className="flex items-center gap-3 mb-3">
        <Badge variant="outline" className={cn('gap-1.5 text-xs', healthBadge.className)}>
          <HealthIcon className="h-3 w-3" />
          {healthBadge.label}
        </Badge>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="h-5 w-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-[9px] font-medium">
            {author.split(' ').map(n => n[0]).join('').slice(0, 2)}
          </div>
          <span>{author}</span>
          <span>·</span>
          <span>{format(date, 'MMM d')}</span>
        </div>
      </div>
      <p className="text-sm text-foreground">{content}</p>
      <div className="flex items-center gap-2 mt-4">
        <button className="p-1.5 hover:bg-accent/50 rounded text-muted-foreground hover:text-foreground">
          <MessageSquare className="h-4 w-4" />
        </button>
        <button className="p-1.5 hover:bg-accent/50 rounded text-muted-foreground hover:text-foreground">
          <Link2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function ProjectDetailView() {
  const { selectedProjectId, projects, issues, setCurrentView, updateProject, setSelectedIssue } = useIssueStore();
  const [activeTab, setActiveTab] = useState('overview');
  const [updateContent, setUpdateContent] = useState('');
  const [selectedHealth, setSelectedHealth] = useState<keyof typeof healthBadges>('on_track');
  const [assigneesTab, setAssigneesTab] = useState<'assignees' | 'labels'>('assignees');
  
  const project = projects.find(p => p.id === selectedProjectId);
  const projectIssues = useMemo(() => 
    issues.filter(i => i.projectId === selectedProjectId),
    [issues, selectedProjectId]
  );
  const completedIssues = useMemo(() => 
    projectIssues.filter(i => i.status === 'done').length,
    [projectIssues]
  );
  
  if (!project) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Project not found
      </div>
    );
  }

  const progressPercent = projectIssues.length > 0 
    ? Math.round((completedIssues / projectIssues.length) * 100) 
    : 0;

  const statusBadge = statusOptions.find(s => s.value === project.status);

  return (
    <div className="flex h-full">
      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Breadcrumb header */}
        <div className="flex items-center gap-2 px-4 h-12 border-b border-border">
          <button 
            onClick={() => setCurrentView('projects')}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Projects
          </button>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-sm flex items-center gap-1.5">
            <Layers className="h-4 w-4 text-muted-foreground" />
            {project.name}
          </span>
          <Star className="h-3.5 w-3.5 text-muted-foreground ml-1 cursor-pointer hover:text-yellow-400" />
          <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground ml-1 cursor-pointer hover:text-foreground" />
          
          <div className="flex-1" />
          
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground">
              <Link2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 px-4 h-10 border-b border-border">
          <button
            onClick={() => setActiveTab('overview')}
            className={cn(
              'px-3 py-1.5 text-sm rounded-md transition-colors flex items-center gap-1.5',
              activeTab === 'overview' ? 'bg-accent text-foreground' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <PenSquare className="h-3.5 w-3.5" />
            Overview
          </button>
          <button
            onClick={() => setActiveTab('updates')}
            className={cn(
              'px-3 py-1.5 text-sm rounded-md transition-colors flex items-center gap-1.5',
              activeTab === 'updates' ? 'bg-accent text-foreground' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            Updates
          </button>
          <button
            onClick={() => setActiveTab('issues')}
            className={cn(
              'px-3 py-1.5 text-sm rounded-md transition-colors flex items-center gap-1.5',
              activeTab === 'issues' ? 'bg-accent text-foreground' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <CircleDot className="h-3.5 w-3.5" />
            Issues
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={cn(
              'px-3 py-1.5 text-sm rounded-md transition-colors',
              activeTab === 'settings' ? 'bg-accent text-foreground' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Settings2 className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Filter bar for issues tab */}
        {activeTab === 'issues' && (
          <div className="flex items-center px-4 h-10 border-b border-border">
            <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-muted-foreground text-xs">
              <Layers className="h-3.5 w-3.5" />
              Filter
            </Button>
            <div className="flex-1" />
            <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs">
              <Settings2 className="h-3.5 w-3.5" />
              Display
            </Button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'overview' && (
            <div className="max-w-3xl mx-auto py-8 px-6">
              <div className="mb-8">
                <div className="flex items-center gap-3 mb-3">
                  <Layers className="h-8 w-8 text-muted-foreground" />
                </div>
                <h1 className="text-2xl font-semibold mb-2">{project.name}</h1>
                <p className="text-muted-foreground text-sm">
                  {project.description || 'Add a short summary...'}
                </p>
              </div>

              <div className="flex items-center gap-4 mb-6 text-sm flex-wrap">
                <span className="text-muted-foreground">Properties</span>
                <Badge variant="outline" className="gap-1.5 text-xs">
                  <CircleDot className="h-3 w-3" />
                  {statusBadge?.label || 'Backlog'}
                </Badge>
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <MoreHorizontal className="h-3.5 w-3.5" />
                  No priority
                </span>
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" />
                  Lead
                </span>
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  Target date
                </span>
              </div>

              <div className="mb-8">
                <p className="text-muted-foreground text-sm mb-3">Resources</p>
                <Button variant="ghost" size="sm" className="text-muted-foreground gap-1.5">
                  <Plus className="h-3.5 w-3.5" />
                  Add document or link...
                </Button>
              </div>

              <div className="bg-card/30 rounded-lg p-6 mb-8 flex items-center justify-center border border-border border-dashed">
                <Button variant="ghost" className="gap-2 text-muted-foreground hover:text-foreground">
                  <PenSquare className="h-4 w-4" />
                  Write first project update
                </Button>
              </div>

              <div className="mb-8">
                <h3 className="text-sm font-medium mb-3">Description</h3>
                <p className="text-muted-foreground text-sm">
                  {project.description || 'Add description...'}
                </p>
              </div>

              <div>
                <Button variant="ghost" size="sm" className="text-muted-foreground gap-1.5">
                  <Plus className="h-3.5 w-3.5" />
                  Milestone
                </Button>
              </div>
            </div>
          )}

          {activeTab === 'updates' && (
            <div className="max-w-3xl mx-auto py-8 px-6">
              {/* New update input */}
              <div className="bg-card/50 rounded-lg border border-border p-4 mb-8">
                <div className="flex items-center gap-2 mb-3">
                  <Badge 
                    variant="outline" 
                    className={cn('gap-1.5 text-xs cursor-pointer', healthBadges[selectedHealth].className)}
                    onClick={() => {
                      const keys = Object.keys(healthBadges) as (keyof typeof healthBadges)[];
                      const idx = keys.indexOf(selectedHealth);
                      setSelectedHealth(keys[(idx + 1) % keys.length]);
                    }}
                  >
                    <Check className="h-3 w-3" />
                    {healthBadges[selectedHealth].label}
                  </Badge>
                </div>
                <Textarea
                  placeholder="Write a project update..."
                  value={updateContent}
                  onChange={(e) => setUpdateContent(e.target.value)}
                  className="min-h-[80px] bg-transparent border-0 resize-none focus-visible:ring-0 p-0 placeholder:text-muted-foreground"
                />
              </div>

              {/* Timeline */}
              <div className="space-y-6">
                {/* Activity event */}
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Diamond className="h-4 w-4" />
                  <span>jawadcoder0 added milestone phase 1 · Jan 23</span>
                </div>

                {/* Update card */}
                <ProjectUpdate
                  health="on_track"
                  author="jawadcoder0"
                  date={new Date(2025, 0, 22)}
                  content="hello"
                />

                {/* Month separator */}
                <div className="flex items-center gap-3 pt-4">
                  <h3 className="text-lg font-semibold">
                    December <span className="text-muted-foreground font-normal">2025</span>
                  </h3>
                </div>

                {/* Activity event */}
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Layers className="h-4 w-4" />
                  <span>jawadcoder0 created the project · Dec 29</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'issues' && (
            <div className="py-2">
              <StatusGroup
                status="backlog"
                label="Backlog"
                issues={projectIssues}
                onIssueClick={setSelectedIssue}
              />
              <StatusGroup
                status="todo"
                label="Todo"
                issues={projectIssues}
                onIssueClick={setSelectedIssue}
              />
              <StatusGroup
                status="in_progress"
                label="In Progress"
                issues={projectIssues}
                onIssueClick={setSelectedIssue}
              />
              <StatusGroup
                status="done"
                label="Done"
                issues={projectIssues}
                onIssueClick={setSelectedIssue}
                defaultExpanded={false}
              />
              <StatusGroup
                status="cancelled"
                label="Cancelled"
                issues={projectIssues}
                onIssueClick={setSelectedIssue}
                defaultExpanded={false}
              />
              
              {projectIssues.length === 0 && (
                <div className="py-12 text-center text-muted-foreground text-sm">
                  No issues in this project
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right sidebar - Properties panel */}
      <div className="w-72 border-l border-border flex flex-col bg-card/30">
        <div className="flex items-center justify-between px-4 h-10 border-b border-border">
          <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            Properties
            <ChevronDown className="h-3 w-3" />
          </span>
          <Plus className="h-3.5 w-3.5 text-muted-foreground cursor-pointer hover:text-foreground" />
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Status */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Status</span>
            <Badge variant="outline" className="gap-1.5 cursor-pointer hover:bg-accent">
              <Circle className="h-3 w-3" />
              {statusBadge?.label || 'Backlog'}
            </Badge>
          </div>

          {/* Priority */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Priority</span>
            <span className="text-red-400 flex items-center gap-1.5 cursor-pointer hover:text-red-300">
              <AlertCircle className="h-3.5 w-3.5" />
              Urgent
            </span>
          </div>

          {/* Lead */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Lead</span>
            <span className="flex items-center gap-1.5 cursor-pointer hover:text-foreground">
              <div className="h-5 w-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-[9px] font-medium">
                {project.lead ? project.lead.split(' ').map(n => n[0]).join('').slice(0, 2) : 'J'}
              </div>
              <span className="text-xs">{project.lead || 'jawadcoder0'}</span>
            </span>
          </div>

          {/* Members */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Members</span>
            <span className="text-muted-foreground flex items-center gap-1.5 cursor-pointer hover:text-foreground">
              <Users className="h-3.5 w-3.5" />
              Add members
            </span>
          </div>

          {/* Start date */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Start date</span>
            <span className="text-muted-foreground flex items-center gap-1.5 cursor-pointer hover:text-foreground">
              <Calendar className="h-3.5 w-3.5" />
            </span>
          </div>

          {/* Target date */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Target date</span>
            <span className="text-muted-foreground flex items-center gap-1.5 cursor-pointer hover:text-foreground">
              <Calendar className="h-3.5 w-3.5" />
            </span>
          </div>

          {/* Teams */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Teams</span>
            <Badge variant="outline" className="gap-1.5 text-xs">
              <div className="h-3 w-3 rounded bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-[8px] font-bold">J</div>
              Jawad
            </Badge>
          </div>

          {/* Labels */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Labels</span>
            <span className="text-muted-foreground flex items-center gap-1.5 cursor-pointer hover:text-foreground">
              <Tag className="h-3.5 w-3.5" />
              Add label
            </span>
          </div>

          <Separator className="bg-border" />

          {/* Milestones */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                Milestones
                <ChevronDown className="h-3 w-3" />
              </span>
              <Plus className="h-3.5 w-3.5 text-muted-foreground cursor-pointer hover:text-foreground" />
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed mb-3">
              Add milestones to organize work within your project and break it into more granular stages.{' '}
              <span className="text-primary cursor-pointer hover:underline">Learn more</span>
            </p>
            {project.milestones && project.milestones.length > 0 ? (
              project.milestones.map((milestone, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm mb-1">
                  <Diamond className="h-4 w-4 text-yellow-400" />
                  <span className="text-xs">{milestone.name}</span>
                  <span className="text-xs text-muted-foreground">0% of 0</span>
                  <div className="flex-1" />
                  <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground cursor-pointer" />
                </div>
              ))
            ) : null}
          </div>

          <Separator className="bg-border" />

          {/* Progress */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                Progress
                <ChevronDown className="h-3 w-3" />
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

          {/* Assignees / Labels tabs */}
          <div>
            <div className="flex mb-3 bg-accent/50 rounded-md p-0.5">
              <button 
                onClick={() => setAssigneesTab('assignees')}
                className={cn(
                  'flex-1 text-xs py-1.5 rounded-sm transition-colors',
                  assigneesTab === 'assignees' ? 'bg-background text-foreground' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Assignees
              </button>
              <button 
                onClick={() => setAssigneesTab('labels')}
                className={cn(
                  'flex-1 text-xs py-1.5 rounded-sm transition-colors',
                  assigneesTab === 'labels' ? 'bg-background text-foreground' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Labels
              </button>
            </div>
            <div className="space-y-2">
              {assigneesTab === 'assignees' ? (
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs flex-1 text-muted-foreground">No assignee</span>
                  <div className="flex items-center gap-1">
                    <div className="h-4 w-4 rounded-full border border-muted-foreground/30" />
                    <span className="text-xs text-muted-foreground">0% of {projectIssues.length}</span>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-muted-foreground">No labels</div>
              )}
            </div>
          </div>

          <Separator className="bg-border" />

          {/* Activity */}
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                Activity
                <ChevronDown className="h-3 w-3" />
              </span>
              <span className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">See all</span>
            </div>
            <div className="mt-3 space-y-2 text-xs text-muted-foreground">
              <div className="flex items-start gap-2">
                <Layers className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span>jawadcoder0 created the project · Jan 21</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}