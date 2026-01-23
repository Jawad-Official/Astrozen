import { useState } from 'react';
import { useIssueStore } from '@/store/issueStore';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronRight, 
  MoreHorizontal, 
  Star, 
  Link2,
  MessageSquare,
  Plus,
  Users,
  Calendar,
  Target,
  Tag,
  PenSquare,
  CircleDot,
  Settings2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Separator } from '@/components/ui/separator';
import { StatusIcon } from '@/components/issues/StatusIcon';

const statusOptions = [
  { value: 'backlog', label: 'Backlog' },
  { value: 'planned', label: 'Planned' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'paused', label: 'Paused' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

export function ProjectDetailView() {
  const { selectedProjectId, projects, issues, setCurrentView, updateProject, setSelectedIssue } = useIssueStore();
  const [activeTab, setActiveTab] = useState('overview');
  
  const project = projects.find(p => p.id === selectedProjectId);
  const projectIssues = issues.filter(i => i.projectId === selectedProjectId);
  const completedIssues = projectIssues.filter(i => i.status === 'done').length;
  
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

  return (
    <div className="flex h-full">
      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Breadcrumb header */}
        <div className="flex items-center gap-2 px-4 h-12 border-b border-white/5">
          <button 
            onClick={() => setCurrentView('projects')}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Projects
          </button>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-sm flex items-center gap-1.5">
            {project.icon} {project.name}
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
        <div className="flex items-center gap-1 px-4 h-10 border-b border-white/5">
          <button
            onClick={() => setActiveTab('overview')}
            className={cn(
              'px-3 py-1.5 text-sm rounded-md transition-colors flex items-center gap-1.5',
              activeTab === 'overview' ? 'bg-white/10 text-foreground' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <PenSquare className="h-3.5 w-3.5" />
            Overview
          </button>
          <button
            onClick={() => setActiveTab('updates')}
            className={cn(
              'px-3 py-1.5 text-sm rounded-md transition-colors flex items-center gap-1.5',
              activeTab === 'updates' ? 'bg-white/10 text-foreground' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            Updates
          </button>
          <button
            onClick={() => setActiveTab('issues')}
            className={cn(
              'px-3 py-1.5 text-sm rounded-md transition-colors flex items-center gap-1.5',
              activeTab === 'issues' ? 'bg-white/10 text-foreground' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <CircleDot className="h-3.5 w-3.5" />
            Issues
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={cn(
              'px-3 py-1.5 text-sm rounded-md transition-colors',
              activeTab === 'settings' ? 'bg-white/10 text-foreground' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Settings2 className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'overview' && (
            <div className="max-w-3xl mx-auto py-8 px-6">
              {/* Project header */}
              <div className="mb-8">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-3xl">{project.icon}</span>
                </div>
                <h1 className="text-2xl font-semibold mb-2">{project.name}</h1>
                <p className="text-muted-foreground text-sm">
                  {project.description || 'Add a short summary...'}
                </p>
              </div>

              {/* Properties */}
              <div className="flex items-center gap-4 mb-6 text-sm">
                <span className="text-muted-foreground">Properties</span>
                <Badge variant="outline" className="gap-1.5 text-xs">
                  <CircleDot className="h-3 w-3" />
                  {statusOptions.find(s => s.value === project.status)?.label || 'Backlog'}
                </Badge>
                <span className="text-muted-foreground">···</span>
                <span className="text-muted-foreground">No priority</span>
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Users className="h-3.5 w-3.5" />
                  Lead
                </span>
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  Target date
                </span>
                <Badge variant="outline" className="gap-1.5 text-xs">
                  <div className="h-3 w-3 rounded bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-[8px] font-bold">J</div>
                  Jawad
                </Badge>
              </div>

              {/* Resources */}
              <div className="mb-8">
                <p className="text-muted-foreground text-sm mb-3">Resources</p>
                <Button variant="ghost" size="sm" className="text-muted-foreground gap-1.5">
                  <Plus className="h-3.5 w-3.5" />
                  Add document or link...
                </Button>
              </div>

              {/* Write first project update */}
              <div className="bg-white/5 rounded-lg p-6 mb-8 flex items-center justify-center border border-white/5 border-dashed">
                <Button variant="ghost" className="gap-2 text-muted-foreground hover:text-foreground">
                  <PenSquare className="h-4 w-4" />
                  Write first project update
                </Button>
              </div>

              {/* Description */}
              <div className="mb-8">
                <h3 className="text-sm font-medium mb-3">Description</h3>
                <p className="text-muted-foreground text-sm">
                  {project.description || 'Add description...'}
                </p>
              </div>

              {/* Milestones */}
              <div>
                <Button variant="ghost" size="sm" className="text-muted-foreground gap-1.5">
                  <Plus className="h-3.5 w-3.5" />
                  Milestone
                </Button>
              </div>
            </div>
          )}

          {activeTab === 'issues' && (
            <div className="p-4">
              <div className="space-y-1">
                {projectIssues.map(issue => (
                  <div 
                    key={issue.id}
                    onClick={() => setSelectedIssue(issue.id)}
                    className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-white/5 cursor-pointer"
                  >
                    <StatusIcon status={issue.status} />
                    <span className="text-xs text-muted-foreground font-mono">{issue.identifier}</span>
                    <span className="text-sm flex-1">{issue.title}</span>
                  </div>
                ))}
                
                {projectIssues.length === 0 && (
                  <div className="py-8 text-center text-muted-foreground text-sm">
                    No issues in this project
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right sidebar - Properties panel */}
      <div className="w-72 border-l border-white/5 flex flex-col">
        <div className="flex items-center justify-between px-4 h-10 border-b border-white/5">
          <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            Properties
            <ChevronRight className="h-3 w-3" />
          </span>
          <Plus className="h-3.5 w-3.5 text-muted-foreground cursor-pointer hover:text-foreground" />
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Status */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Status</span>
            <Badge variant="outline" className="gap-1.5">
              <CircleDot className="h-3 w-3" />
              {statusOptions.find(s => s.value === project.status)?.label || 'Backlog'}
            </Badge>
          </div>

          {/* Priority */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Priority</span>
            <span className="text-muted-foreground">··· No priority</span>
          </div>

          {/* Lead */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Lead</span>
            <span className="text-muted-foreground flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" />
              {project.lead || 'Add lead'}
            </span>
          </div>

          {/* Members */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Members</span>
            <span className="text-muted-foreground flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" />
              Add members
            </span>
          </div>

          {/* Start date */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Start date</span>
            <span className="text-muted-foreground flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
            </span>
          </div>

          {/* Target date */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Target date</span>
            <span className="text-muted-foreground flex items-center gap-1.5">
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
            <span className="text-muted-foreground flex items-center gap-1.5">
              <Tag className="h-3.5 w-3.5" />
              Add label
            </span>
          </div>

          <Separator className="bg-white/5" />

          {/* Milestones */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                Milestones
                <ChevronRight className="h-3 w-3" />
              </span>
              <Plus className="h-3.5 w-3.5 text-muted-foreground cursor-pointer hover:text-foreground" />
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Add milestones to organize work within your project and break it into more granular stages.{' '}
              <a href="#" className="text-primary hover:underline">Learn more</a>
            </p>
          </div>

          <Separator className="bg-white/5" />

          {/* Progress */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                Progress
                <ChevronRight className="h-3 w-3" />
              </span>
            </div>
            <div className="flex gap-8 text-xs mb-2">
              <div>
                <span className="text-muted-foreground">■ Scope</span>
                <p className="font-medium">{projectIssues.length}</p>
              </div>
              <div>
                <span className="text-emerald-400">■ Completed</span>
                <p className="font-medium">{completedIssues} · {progressPercent}%</p>
              </div>
            </div>
          </div>

          <Separator className="bg-white/5" />

          {/* Assignees / Labels / Projects tabs */}
          <div>
            <div className="flex gap-2 mb-3">
              <button className="flex-1 text-xs py-1.5 bg-white/10 rounded-md">Assignees</button>
              <button className="flex-1 text-xs py-1.5 text-muted-foreground hover:bg-white/5 rounded-md">Labels</button>
            </div>
            <div className="space-y-2">
              {project.lead && (
                <div className="flex items-center gap-2">
                  <div className="h-5 w-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-[9px] font-medium">
                    {project.lead.split(' ').map(n => n[0]).join('')}
                  </div>
                  <span className="text-xs flex-1">{project.lead}</span>
                  <span className="text-xs text-muted-foreground">{projectIssues.length}</span>
                </div>
              )}
            </div>
          </div>

          <Separator className="bg-white/5" />

          {/* Activity */}
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                Activity
                <ChevronRight className="h-3 w-3" />
              </span>
              <span className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">See all</span>
            </div>
            <div className="mt-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-[8px] font-medium">
                  J
                </div>
                <span>jawadcoder0 created the project · Jan 21</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}