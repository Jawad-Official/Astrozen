import { useState, useMemo } from 'react';
import { useIssueStore } from '@/store/issueStore';
import { useAuth } from '@/context/AuthContext';
import { hasTeamAccess } from '@/lib/permissions';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Columns, 
  Eye,
  Lock,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { Project, ProjectStatus } from '@/types/issue';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ProjectBar } from '@/components/ProjectBar';
import { PROJECT_STATUS_CONFIG, PROJECT_PRIORITY_OPTIONS } from '@/lib/constants';
import { useToast } from '@/hooks/use-toast';

const statusOrder: ProjectStatus[] = ['in_progress', 'planned', 'backlog', 'paused', 'completed', 'cancelled'];

const ProjectsPage = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const teamId = searchParams.get('team');
  const { user, teams } = useAuth();
  
  const { projects: allProjects, issues, features, teams: storeTeams, orgMembers, deleteProject, addProject, isLoading } = useIssueStore();
  const [activeTab, setActiveTab] = useState<'projects' | 'all'>('projects');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const projects = useMemo(() => {
    let result = allProjects;
    if (teamId) {
      result = result.filter(p => p.teamId === teamId);
    }
    
    if (activeTab === 'projects' && user) {
      result = result.filter(p => p.lead === user.id || p.members?.includes(user.id));
    }
    
    return result;
  }, [allProjects, teamId, activeTab, user]);

  const groupedProjects = useMemo(() => {
    const groups: Record<ProjectStatus, Project[]> = {
      backlog: [], planned: [], in_progress: [], paused: [], completed: [], cancelled: [],
    };
    projects.forEach((project) => {
      if (project.status && groups[project.status]) groups[project.status].push(project);
    });
    
    return groups;
  }, [projects]);

  const handleAddProject = async (projectData: any) => {
    try {
      await addProject(projectData);
      toast({ title: 'Project created' });
    } catch (error: any) {
      toast({ 
        title: 'Failed to create project', 
        description: error.response?.data?.detail || 'An error occurred',
        variant: 'destructive' 
      });
    }
  };

  const handleDeleteProject = async (id: string) => {
    // This is also handled in Row, but we should make sure the store action call here is also wrapped
    try {
      await deleteProject(id);
      // Row handles its own success toast
    } catch (error: any) {
      // Row handles its own error toast, but we re-throw or handle if needed
      throw error;
    }
  };

  const getStatusColorClass = (status: ProjectStatus) => {
    switch (status) {
      case 'backlog': return 'bg-purple-400';
      case 'planned': return 'bg-zinc-400';
      case 'in_progress': return 'bg-cyan-400';
      case 'paused': return 'bg-orange-400';
      case 'completed': return 'bg-emerald-400';
      case 'cancelled': return 'bg-red-400';
      default: return 'bg-primary/40';
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#090909]">
      <div className="flex items-center justify-between px-4 h-14 border-b border-white/5 bg-[#090909] shrink-0">
        <div className="flex items-center gap-1 bg-white/[0.03] p-1 rounded-lg border border-white/5">
          <button onClick={() => setActiveTab('projects')} className={cn('px-3 py-1.5 text-xs font-semibold rounded-md transition-all duration-200', activeTab === 'projects' ? 'bg-white/10 text-white shadow-sm' : 'text-white/40 hover:text-white/60')}>My projects</button>
          <button onClick={() => setActiveTab('all')} className={cn('px-3 py-1.5 text-xs font-semibold rounded-md transition-all duration-200 flex items-center gap-2', activeTab === 'all' ? 'bg-white/10 text-white shadow-sm' : 'text-white/40 hover:text-white/60')}><Eye className="h-3.5 w-3.5" />All projects</button>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="h-9 gap-2 bg-primary/10 text-primary hover:bg-primary/20 transition-all rounded-lg px-4 border border-primary/20" onClick={() => setCreateDialogOpen(true)}><Plus className="h-4 w-4" /><span className="font-semibold">New Project</span></Button>
          <div className="w-[1px] h-6 bg-white/10 mx-1" />
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg hover:bg-white/5 text-white/40"><Columns className="h-4 w-4" /></Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center bg-[#090909]">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto scrollbar-none px-2 py-4">
          <div className="max-w-7xl mx-auto space-y-8 pb-20">
            {statusOrder.map((status) => {
              const statusProjects = groupedProjects[status];
              if (statusProjects.length === 0) return null;
              return (
                <div key={status}>
                  <div className="flex items-center gap-3 px-4 py-2 mb-2">
                    <Badge variant="outline" className={cn("h-5 px-2 text-[9px] font-black uppercase tracking-[0.2em] bg-white/5 border-white/5", getStatusColorClass(status).replace('bg-', 'text-'))}>
                      {PROJECT_STATUS_CONFIG[status].label}
                    </Badge>
                    <span className="flex h-5 w-5 items-center justify-center rounded-md bg-white/5 text-[10px] font-bold text-white/20 border border-white/5">{statusProjects.length}</span>
                  </div>
                  <div className="space-y-1">
                    {statusProjects.map((project) => (
                      <ProjectBar.Row 
                        key={project.id} 
                        project={project} 
                        issues={issues} 
                        features={features} 
                        orgMembers={orgMembers}
                        user={user}
                        teams={teams}
                        onDelete={handleDeleteProject} 
                        onClick={() => navigate(`/projects/${project.id}`)} 
                      />
                    ))}
                  </div>
                </div>
              );
            })}
            {projects.length === 0 && (
               <div className="flex flex-col items-center justify-center py-20 text-muted-foreground animate-in fade-in zoom-in duration-500">
                 <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-center mb-6 shadow-2xl">
                   <div className="text-3xl opacity-50">📁</div>
                 </div>
                 <h3 className="text-xl font-semibold text-white/90 mb-2">No projects yet</h3>
                 <p className="text-sm text-white/40 mb-8 max-w-[280px] text-center">Get started by creating your first project to organize your team's work.</p>
                 <Button 
                   onClick={() => setCreateDialogOpen(true)}
                   className="h-10 px-6 gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all hover:scale-105"
                 >
                   <Plus className="h-4 w-4" />
                   Create Project
                 </Button>
               </div>
            )}
          </div>
        </div>
      )}
      <ProjectBar.Create 
        open={createDialogOpen} 
        onOpenChange={setCreateDialogOpen} 
        projects={allProjects} 
        teams={teams}
        orgMembers={orgMembers}
        selectedTeamId={teamId}
        onAddProject={handleAddProject} 
      />
    </div>
  );
};

export default ProjectsPage;
