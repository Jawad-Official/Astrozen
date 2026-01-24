import { useState, useMemo } from 'react';
import { useIssueStore } from '@/store/issueStore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Filter, 
  Columns3, 
  Link2,
  Eye,
  ChevronDown,
  Check,
  Circle,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Project, ProjectHealth, ProjectStatus } from '@/types/issue';
import { format } from 'date-fns';
import { CreateProjectDialog } from './CreateProjectDialog';

interface ProjectRowProps {
  project: Project;
  onClick: () => void;
}

const healthConfig: Record<ProjectHealth, { label: string; color: string; icon: React.ReactNode }> = {
  on_track: { 
    label: 'On track', 
    color: 'text-emerald-400',
    icon: <Check className="h-3 w-3 text-emerald-400" />
  },
  at_risk: { 
    label: 'At risk', 
    color: 'text-yellow-400',
    icon: <AlertCircle className="h-3 w-3 text-yellow-400" />
  },
  off_track: { 
    label: 'Off track', 
    color: 'text-red-400',
    icon: <AlertCircle className="h-3 w-3 text-red-400" />
  },
  no_updates: { 
    label: 'No updates', 
    color: 'text-muted-foreground',
    icon: <Circle className="h-3 w-3 text-muted-foreground" />
  },
};

const statusConfig: Record<ProjectStatus, { label: string; color: string }> = {
  backlog: { label: 'Backlog', color: 'bg-muted-foreground/20' },
  planned: { label: 'Planned', color: 'bg-blue-500/20' },
  in_progress: { label: 'In Progress', color: 'bg-yellow-500/20' },
  paused: { label: 'Paused', color: 'bg-orange-500/20' },
  completed: { label: 'Completed', color: 'bg-emerald-500/20' },
  cancelled: { label: 'Cancelled', color: 'bg-red-500/20' },
};

function ProjectRow({ project, onClick }: ProjectRowProps) {
  const allIssues = useIssueStore(state => state.issues);
  
  const { completedIssues, totalIssues, progressPercent } = useMemo(() => {
    const projectIssues = allIssues.filter(i => i.projectId === project.id);
    const completed = projectIssues.filter(i => i.status === 'done').length;
    const total = projectIssues.length;
    return {
      completedIssues: completed,
      totalIssues: total,
      progressPercent: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  }, [allIssues, project.id]);

  const health = healthConfig[project.health];
  const status = statusConfig[project.status];

  return (
    <div 
      className="flex items-center gap-4 px-4 py-3 hover:bg-white/5 cursor-pointer border-b border-white/5 transition-colors group"
      onClick={onClick}
    >
      {/* Icon and Name */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <span className="text-lg">{project.icon}</span>
        <span className="font-medium text-sm truncate">{project.name}</span>
      </div>

      {/* Health */}
      <div className="flex items-center gap-2 w-32">
        {health.icon}
        <span className={cn('text-xs', health.color)}>
          {health.label}
        </span>
        {project.health === 'on_track' && project.updatedAt && (
          <span className="text-xs text-muted-foreground">
            · {Math.floor((Date.now() - project.updatedAt.getTime()) / (1000 * 60 * 60 * 24))}d
          </span>
        )}
      </div>

      {/* Priority */}
      <div className="w-16 flex justify-center">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-red-500" />
        </div>
      </div>

      {/* Lead */}
      <div className="w-32 flex items-center gap-2">
        {project.lead ? (
          <>
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 text-[9px] font-medium">
              {project.lead.split(' ').map(n => n[0]).join('')}
            </div>
            <span className="text-xs text-muted-foreground truncate">{project.lead}</span>
          </>
        ) : (
          <span className="text-xs text-muted-foreground">No lead</span>
        )}
      </div>

      {/* Target date */}
      <div className="w-24 flex items-center">
        <span className="text-xs text-muted-foreground">
          {project.targetDate ? format(project.targetDate, 'MMM d') : '—'}
        </span>
      </div>

      {/* Status / Progress */}
      <div className="w-20 flex items-center gap-2">
        <div className="flex items-center gap-1">
          <Circle className={cn('h-3 w-3', progressPercent === 100 ? 'text-emerald-400' : 'text-muted-foreground')} />
          <span className="text-xs text-muted-foreground">{progressPercent}%</span>
        </div>
      </div>
    </div>
  );
}

export function ProjectsView() {
  const { projects, setCurrentView, setSelectedProject } = useIssueStore();
  const [activeTab, setActiveTab] = useState<'projects' | 'all'>('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const handleProjectClick = (project: Project) => {
    setSelectedProject(project.id);
    setCurrentView('project-detail');
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-12 border-b border-white/5">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('projects')}
            className={cn(
              'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
              activeTab === 'projects' ? 'bg-white/10 text-foreground' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Projects
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={cn(
              'px-3 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-1.5',
              activeTab === 'all' ? 'bg-white/10 text-foreground' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Eye className="h-3.5 w-3.5" />
            All projects
          </button>
          <button className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground flex items-center gap-1.5">
            <Eye className="h-3.5 w-3.5" />
            New view
          </button>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-muted-foreground hover:text-foreground">
            <Link2 className="h-3.5 w-3.5" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 gap-1.5"
            onClick={() => setCreateDialogOpen(true)}
          >
            <Plus className="h-3.5 w-3.5" />
            Add project
          </Button>
          <Button variant="ghost" size="sm" className="h-8 gap-1.5">
            <Columns3 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Sub header with filter */}
      <div className="flex items-center px-4 h-10 border-b border-white/5">
        <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-muted-foreground">
          <Filter className="h-3.5 w-3.5" />
          Filter
        </Button>
      </div>

      {/* Table header */}
      <div className="flex items-center gap-4 px-4 py-2 text-xs text-muted-foreground border-b border-white/5 bg-white/[0.02]">
        <div className="flex-1">Name</div>
        <div className="w-32">Health</div>
        <div className="w-16 text-center">Priority</div>
        <div className="w-32">Lead</div>
        <div className="w-24">Target date</div>
        <div className="w-20">Status</div>
      </div>

      {/* Projects list */}
      <div className="flex-1 overflow-y-auto">
        {projects.map(project => (
          <ProjectRow 
            key={project.id} 
            project={project} 
            onClick={() => handleProjectClick(project)}
          />
        ))}
        
        {projects.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <p className="text-sm">No projects yet</p>
            <Button 
              variant="ghost" 
              size="sm" 
              className="mt-2 gap-1.5"
              onClick={() => setCreateDialogOpen(true)}
            >
              <Plus className="h-4 w-4" />
              Create a project
            </Button>
          </div>
        )}
      </div>

      <CreateProjectDialog 
        open={createDialogOpen} 
        onOpenChange={setCreateDialogOpen} 
      />
    </div>
  );
}