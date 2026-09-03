import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { useIssueStore } from '@/store/issueStore';
import { Button } from '@/components/ui/button';
import {
  MagicWand,
  CaretRight,
  DotsThree,
  Star,
  Link,
  ChatTeardropText,
  Tag,
  NotePencil,
  CircleHalf,
  Sliders,
  Sidebar as SidebarIcon,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { ProjectStatus, ProjectHealth, ProjectPriority, ProjectUpdate as ProjectUpdateType } from '@/types/issue';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useNavigate, useParams, useOutletContext, useSearchParams } from 'react-router-dom';
import { ProjectBar } from '@/components/ProjectBar';
import { PlansTab } from './PlansTab';
import { StatusGroup } from '@/components/StatusGroup';
import { MilestoneDialog } from '@/components/dialogs/MilestoneDialog';
import { FeatureWindow } from '@/components/FeatureWindow';
import { CreateIssueDialog } from '@/components/issue/CreateIssueDialog';
import { ProjectOverviewTab } from './components/ProjectOverviewTab';
import { ProjectUpdatesTab } from './components/ProjectUpdatesTab';
import { ProjectPropertiesSidebar } from './components/ProjectPropertiesSidebar';
import { PROJECT_STATUS_OPTIONS } from '@/lib/project-options';
import { PROJECT_PRIORITY_OPTIONS } from '@/lib/constants';

interface MainLayoutContext {
  onCreateIssue: () => void;
  onCreateSubIssue: (parentId: string) => void;
  onOpenCommandPalette: () => void;
}

const ProjectDetailPage = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { projectId } = useParams();
  const { user } = useAuth();
  const {
    projects, features, issues, teams, orgMembers, updateProject, setSelectedIssue, currentUser,
    addProjectUpdate, deleteProjectUpdate, addProjectResource, deleteProjectResource,
    toggleProjectFavorite, addFeature, updateFeature, deleteFeature,
    addFeatureMilestone, updateFeatureMilestone, deleteFeatureMilestone, toggleFeatureMilestone,
    addUpdateComment, deleteUpdateComment, toggleUpdateReaction, toggleUpdateCommentReaction,
    addIssue, updateIssue, deleteIssue, deleteProject
  } = useIssueStore();
  
  const { onCreateSubIssue } = useOutletContext<MainLayoutContext>();
  const project = projects.find(p => p.id === projectId);
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'overview';
  
  const [activeTab, setActiveTab] = useState(initialTab);
  const [updateContent, setUpdateContent] = useState('');
  const [selectedHealth, setSelectedHealth] = useState<ProjectHealth>('on_track');
  const [showSidebar, setShowSidebar] = useState(true);

  const [milestoneDialogOpen, setMilestoneDialogOpen] = useState(false);

  const [resourceDialogOpen, setResourceDialogOpen] = useState(false);
  const [resourceName, setResourceName] = useState('');
  const [resourceUrl, setResourceUrl] = useState('');
  
  const [memberSearch, setMemberSearch] = useState('');
  
  const [editingDescription, setEditingDescription] = useState(false);
  const [descriptionDraft, setDescriptionDraft] = useState('');

  // Feature specific state
  const [createFeatureOpen, setCreateFeatureOpen] = useState(false);
  const [newFeatureName, setNewFeatureName] = useState('');
  const [selectedFeatureId, setSelectedFeatureId] = useState<string | null>(null);
  
  const [createFeatureMilestoneOpen, setCreateFeatureMilestoneOpen] = useState(false);
  const [activeFeatureId, setActiveFeatureId] = useState<string | null>(null);
  const [newFeatureMilestoneParent, setNewFeatureMilestoneParent] = useState<string | undefined>();
  
  const [createIssueOpen, setCreateIssueOpen] = useState(false);
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<string | undefined>();

  useEffect(() => {
    if (searchParams.get('tab')) {
      setActiveTab(searchParams.get('tab')!);
    }
  }, [searchParams]);
  
  // Update selected health when project loads
  useEffect(() => {
    if (project?.health) {
      setSelectedHealth(project.health);
    }
  }, [project?.id, project?.health]);

  const currentStatus = project ? (PROJECT_STATUS_OPTIONS.find(s => s.value === project.status) || PROJECT_STATUS_OPTIONS[0]) : PROJECT_STATUS_OPTIONS[0];
  const currentPriority = project ? (PROJECT_PRIORITY_OPTIONS.find(p => p.value === project.priority) || PROJECT_PRIORITY_OPTIONS[4]) : PROJECT_PRIORITY_OPTIONS[4];

  const canManageProject = useMemo(() => {
    if (!user || !project) return false;
    const isAdmin = user.role === 'admin';
    if (isAdmin) return true;
    const assignedTeamIds = [project.teamId, ...(project.teams || [])].filter(Boolean);
    const isTeamLeader = teams.some(team => 
      assignedTeamIds.includes(team.id) && 
      team.leaders?.some(l => l.id === user.id)
    );
    return isTeamLeader;
  }, [user, project, teams]);

  const sortedUpdates = useMemo(() => {
    if (!project?.updates) return [];
    return [...project.updates].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [project?.updates]);
  
  const projectFeatures = useMemo(() => 
    project ? features.filter(f => f.projectId === projectId) : [],
    [features, projectId, project]
  );

  const projectFeatureIds = useMemo(() => 
    projectFeatures.map(f => f.id),
    [projectFeatures]
  );

  const projectIssues = useMemo(() => 
    issues.filter(i => projectFeatureIds.includes(i.featureId)),
    [issues, projectFeatureIds]
  );

  const completedIssues = useMemo(() => 
    projectIssues.filter(i => i.status === 'done').length,
    [projectIssues]
  );

  const assigneeStats = useMemo(() => {
    const stats: Record<string, { total: number; completed: number; displayName: string }> = {};
    projectIssues.forEach(issue => {
      const assigneeId = issue.assignee || 'Unassigned';
      let displayName = 'Unassigned';
      if (assigneeId !== 'Unassigned') {
        const member = orgMembers.find(m => m.id === assigneeId);
        displayName = member ? member.full_name : assigneeId;
      }
      if (!stats[assigneeId]) {
        stats[assigneeId] = { total: 0, completed: 0, displayName };
      }
      stats[assigneeId].total++;
      if (issue.status === 'done') {
        stats[assigneeId].completed++;
      }
    });
    return Object.entries(stats).map(([id, data]) => ({
      id,
      name: data.displayName,
      total: data.total,
      completed: data.completed,
      percent: data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0,
    }));
  }, [projectIssues, orgMembers]);

  const getLeadName = () => {
    if (!project?.lead) return null;
    if (project.leadName) return project.leadName;
    const leadMember = orgMembers.find(m => m.id === project.lead);
    return leadMember ? `${leadMember.first_name} ${leadMember.last_name}` : project.lead;
  };

  const leadName = getLeadName();

  const progressPercent = projectIssues.length > 0 
    ? Math.round((completedIssues / projectIssues.length) * 100) 
    : 0;

  if (!project) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
          <p className="text-sm font-medium">Loading project...</p>
        </div>
      </div>
    );
  }

  const handleDeleteProject = async () => {
    if (!confirm(`Delete project "${project.name}"? This action cannot be undone.`)) return;
    try {
      await deleteProject(project.id);
      toast({ title: 'Project deleted' });
      navigate('/projects');
    } catch (error: any) {
      toast({
        title: 'Failed to delete project',
        description: error.response?.data?.detail || 'An error occurred',
        variant: 'destructive'
      });
    }
  };

  const handleStatusChange = async (status: ProjectStatus) => {
    try {
      await updateProject(project.id, { status });
      toast({ title: 'Status updated' });
    } catch {
      toast({ title: 'Failed to update status', variant: 'destructive' });
    }
  };

  const handlePriorityChange = async (priority: ProjectPriority) => {
    try {
      await updateProject(project.id, { priority });
      toast({ title: 'Priority updated' });
    } catch {
      toast({ title: 'Failed to update priority', variant: 'destructive' });
    }
  };

  const handleLeadChange = async (lead: string) => {
    try {
      await updateProject(project.id, { lead: lead || undefined });
      toast({ title: 'Lead updated' });
    } catch {
      toast({ title: 'Failed to update lead', variant: 'destructive' });
    }
  };

  const handleToggleMember = async (memberId: string) => {
    if (!memberId) return;
    const currentMembers = project.members || [];
    const isMember = currentMembers.includes(memberId);
    const updatedMembers = isMember 
      ? currentMembers.filter(m => m !== memberId)
      : [...currentMembers, memberId];
    try {
      await updateProject(project.id, { members: updatedMembers });
      toast({ title: isMember ? 'Member removed' : 'Member added' });
    } catch {
      toast({ title: 'Failed to update member', variant: 'destructive' });
    }
  };

  const handleToggleTeam = async (teamId: string) => {
    const teamsList = project.teams || [];
    const hasTeam = teamsList.includes(teamId);
    const updatedTeams = hasTeam ? teamsList.filter(t => t !== teamId) : [...teamsList, teamId];
    try {
      await updateProject(project.id, { teams: updatedTeams });
      toast({ title: hasTeam ? 'Team removed' : 'Team added' });
    } catch {
      toast({ title: 'Failed to update team', variant: 'destructive' });
    }
  };

  const handleDateChange = async (field: 'startDate' | 'targetDate', date: Date | undefined) => {
    try {
      await updateProject(project.id, { [field]: date });
      toast({ title: 'Date updated' });
    } catch {
      toast({ title: 'Failed to update date', variant: 'destructive' });
    }
  };

  const handleAddMilestone = async (data: { name: string; description: string; targetDate?: string }) => {
    try {
      await updateProject(project.id, { 
        milestones: [...(project.milestones || []), { 
          id: Math.random().toString(36).substr(2, 9), 
          ...data, 
          targetDate: data.targetDate ? new Date(data.targetDate) : undefined,
          completed: false 
        }]
      });
      setMilestoneDialogOpen(false);
      toast({ title: 'Milestone added' });
    } catch {
      toast({ title: 'Failed to add milestone', variant: 'destructive' });
    }
  };


  const handleAddResource = async () => {
    if (!resourceName.trim() || !resourceUrl.trim()) return;
    try {
      await addProjectResource(project.id, { 
        name: resourceName.trim(), 
        url: resourceUrl.trim(), 
        type: 'link'
      });
      setResourceDialogOpen(false);
      setResourceName(''); setResourceUrl('');
      toast({ title: 'Resource added' });
    } catch {
      toast({ title: 'Failed to add resource', variant: 'destructive' });
    }
  };

  const handleDeleteResource = async (resourceId: string) => {
    try {
      await deleteProjectResource(project.id, resourceId);
      toast({ title: 'Resource deleted' });
    } catch {
      toast({ title: 'Failed to delete resource', variant: 'destructive' });
    }
  };

  const handleSaveDescription = async () => {
    try {
      await updateProject(project.id, { description: descriptionDraft.trim() || undefined });
      setEditingDescription(false);
      toast({ title: 'Description updated' });
    } catch {
      toast({ title: 'Failed to update description', variant: 'destructive' });
    }
  };

  const handleAddUpdate = async () => {
    if (!updateContent.trim()) return;
    try {
      await addProjectUpdate(project.id, { content: updateContent.trim(), health: selectedHealth });
      setUpdateContent('');
      toast({ title: 'Update posted' });
    } catch {
      toast({ title: 'Failed to post update', variant: 'destructive' });
    }
  };

  const handleDeleteUpdate = async (updateId: string) => {
    try {
      await deleteProjectUpdate(project.id, updateId);
      toast({ title: 'Update deleted' });
    } catch {
      toast({ title: 'Failed to delete update', variant: 'destructive' });
    }
  };

  const handleUpdateUpdate = async (updateId: string, updates: Partial<ProjectUpdateType>) => {
    const updatedUpdates = project.updates.map(u => u.id === updateId ? { ...u, ...updates } : u);
    try {
      await updateProject(project.id, { updates: updatedUpdates });
    } catch {
      toast({ title: 'Failed to update update', variant: 'destructive' });
    }
  };

  const handleAddUpdateComment = async (updateId: string, content: string, parentId?: string) => {
    try {
      await addUpdateComment(project.id, updateId, content, parentId);
    } catch {
      toast({ title: 'Failed to add comment', variant: 'destructive' });
    }
  };

  const handleDeleteUpdateComment = async (updateId: string, commentId: string) => {
    try {
      await deleteUpdateComment(project.id, updateId, commentId);
    } catch {
      toast({ title: 'Failed to delete comment', variant: 'destructive' });
    }
  };

  const handleAddFeature = async () => {
    if (!newFeatureName.trim()) return;
    try {
      await addFeature({ name: newFeatureName.trim(), projectId: project.id, status: 'discovery' });
      setNewFeatureName(''); setCreateFeatureOpen(false);
      toast({ title: 'Feature created' });
    } catch {
      toast({ title: 'Failed to create feature', variant: 'destructive' });
    }
  };

  const handleAddFeatureMilestone = async (data: { name: string; description: string; targetDate?: string; parentId?: string }) => {
    if (!activeFeatureId) return;
    await addFeatureMilestone(activeFeatureId, data);
    setActiveFeatureId(null); setCreateFeatureMilestoneOpen(false);
    toast({ title: 'Milestone added' });
  };

  return (
    <div className="flex h-full">
      <div className="flex-1 flex flex-col overflow-hidden transition-all duration-300">
        <div className="flex items-center gap-2 px-4 h-12 border-b border-border bg-background shrink-0">
          <button 
            onClick={() => navigate('/projects')}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Projects
          </button>
          <CaretRight className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-sm flex items-center gap-1.5">
            <span className="text-lg">{project.icon}</span>
            {project.name}
          </span>
          <Star 
            className={cn(
              "h-3.5 w-3.5 ml-1 cursor-pointer transition-colors", 
              project.isFavorite ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground hover:text-yellow-400"
            )} 
            onClick={() => toggleProjectFavorite(project.id)}
          />
          <DotsThree className="h-3.5 w-3.5 text-muted-foreground ml-1 cursor-pointer hover:text-foreground" />
          
          <div className="flex-1" />
          
          <ProjectBar.HealthBadge health={project.health} />
          
          <div className="w-[1px] h-4 bg-border mx-2" />
          
          <Button
            variant="ghost"
            size="icon"
            className={cn("h-7 w-7 text-muted-foreground hover:text-foreground", !showSidebar && "bg-accent text-accent-foreground")}
            onClick={() => setShowSidebar(!showSidebar)}
          >
            <SidebarIcon className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-1 px-4 h-10 border-b border-border bg-background shrink-0 overflow-x-auto custom-scrollbar no-scrollbar">
          {['overview', 'updates', 'issues', 'plans'].map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                setSearchParams({ tab });
              }}
              className={cn(
                'px-3 py-1.5 text-sm rounded-md transition-colors flex items-center gap-1.5 capitalize',
                activeTab === tab ? 'bg-accent text-foreground' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {tab === 'overview' && <NotePencil className="h-3.5 w-3.5" />}
              {tab === 'updates' && <ChatTeardropText className="h-3.5 w-3.5" />}
              {tab === 'issues' && <CircleHalf className="h-3.5 w-3.5" />}
              {tab === 'plans' && <MagicWand className="h-3.5 w-3.5" />}
              {tab}
              {tab === 'updates' && project.updates?.length > 0 && (
                <span className="text-xs text-muted-foreground">({project.updates.length})</span>
              )}
            </button>
          ))}
          <button
            onClick={() => {
              setActiveTab('settings');
              setSearchParams({ tab: 'settings' });
            }}
            className={cn(
              'px-3 py-1.5 text-sm rounded-md transition-colors',
              activeTab === 'settings' ? 'bg-accent text-foreground' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Sliders className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto bg-background">
          {activeTab === 'plans' && (
            <PlansTab 
              projectId={project.id} 
              initialIdeaId={searchParams.get('ideaId') || undefined} 
            />
          )}
          {activeTab === 'overview' && (
            <ProjectOverviewTab
              project={project}
              currentStatus={currentStatus}
              currentPriority={currentPriority}
              leadName={leadName}
              orgMembers={orgMembers}
              teams={teams}
              canManageProject={canManageProject}
              editingDescription={editingDescription}
              setEditingDescription={setEditingDescription}
              descriptionDraft={descriptionDraft}
              setDescriptionDraft={setDescriptionDraft}
              handleSaveDescription={handleSaveDescription}
              handleStatusChange={handleStatusChange}
              handlePriorityChange={handlePriorityChange}
              handleLeadChange={handleLeadChange}
              handleToggleTeam={handleToggleTeam}
              handleDateChange={handleDateChange}
              handleDeleteResource={handleDeleteResource}
              setResourceDialogOpen={setResourceDialogOpen}
              sortedUpdates={sortedUpdates}
              setActiveTab={setActiveTab}
              user={user}
              currentUser={currentUser}
              handleDeleteUpdate={handleDeleteUpdate}
              handleUpdateUpdate={handleUpdateUpdate}
              handleAddUpdateComment={handleAddUpdateComment}
              handleDeleteUpdateComment={handleDeleteUpdateComment}
              toggleUpdateReaction={toggleUpdateReaction}
              toggleUpdateCommentReaction={toggleUpdateCommentReaction}
              projectFeatures={projectFeatures}
              projects={projects}
              updateFeature={updateFeature}
              deleteFeature={deleteFeature}
              setSelectedFeatureId={setSelectedFeatureId}
              setCreateFeatureOpen={setCreateFeatureOpen}
              setActiveFeatureId={setActiveFeatureId}
              setNewFeatureMilestoneParent={setNewFeatureMilestoneParent}
              setCreateFeatureMilestoneOpen={setCreateFeatureMilestoneOpen}
              setSelectedMilestoneId={setSelectedMilestoneId}
              setCreateIssueOpen={setCreateIssueOpen}
              toggleFeatureMilestone={toggleFeatureMilestone}
              updateFeatureMilestone={updateFeatureMilestone}
              deleteFeatureMilestone={deleteFeatureMilestone}
            />
          )}

          {activeTab === 'updates' && (
            <ProjectUpdatesTab
              project={project}
              selectedHealth={selectedHealth}
              setSelectedHealth={setSelectedHealth}
              updateContent={updateContent}
              setUpdateContent={setUpdateContent}
              handleAddUpdate={handleAddUpdate}
              sortedUpdates={sortedUpdates}
              user={user}
              currentUser={currentUser}
              handleDeleteUpdate={handleDeleteUpdate}
              handleUpdateUpdate={handleUpdateUpdate}
              handleAddUpdateComment={handleAddUpdateComment}
              handleDeleteUpdateComment={handleDeleteUpdateComment}
              toggleUpdateReaction={toggleUpdateReaction}
              toggleUpdateCommentReaction={toggleUpdateCommentReaction}
            />
          )}

          {activeTab === 'issues' && (
            <div className="py-2">
            <StatusGroup status="backlog" label="Backlog" issues={projectIssues} onIssueClick={setSelectedIssue} projects={projects} features={features} orgMembers={orgMembers} onUpdateIssue={updateIssue} onDeleteIssue={deleteIssue} onCreateSubIssue={onCreateSubIssue} />
            <StatusGroup status="todo" label="Todo" issues={projectIssues} onIssueClick={setSelectedIssue} projects={projects} features={features} orgMembers={orgMembers} onUpdateIssue={updateIssue} onDeleteIssue={deleteIssue} onCreateSubIssue={onCreateSubIssue} />
            <StatusGroup status="in_progress" label="In Progress" issues={projectIssues} onIssueClick={setSelectedIssue} projects={projects} features={features} orgMembers={orgMembers} onUpdateIssue={updateIssue} onDeleteIssue={deleteIssue} onCreateSubIssue={onCreateSubIssue} />
            <StatusGroup status="done" label="Done" issues={projectIssues} onIssueClick={setSelectedIssue} projects={projects} features={features} orgMembers={orgMembers} onUpdateIssue={updateIssue} onDeleteIssue={deleteIssue} defaultExpanded={false} onCreateSubIssue={onCreateSubIssue} />
            <StatusGroup status="cancelled" label="Cancelled" issues={projectIssues} onIssueClick={setSelectedIssue} projects={projects} features={features} orgMembers={orgMembers} onUpdateIssue={updateIssue} onDeleteIssue={deleteIssue} defaultExpanded={false} onCreateSubIssue={onCreateSubIssue} />
              
              {projectIssues.length === 0 && (
                <div className="py-12 text-center text-muted-foreground text-sm">
                  No issues in this project
                </div>
              )}
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="max-w-2xl mx-auto py-8 px-6">
              <h2 className="text-lg font-semibold mb-6">Project settings</h2>
              <div className="space-y-6">
                {canManageProject ? (
                  <div className="bg-card/50 border border-border rounded-lg p-4">
                    <h3 className="text-sm font-medium mb-2">Danger zone</h3>
                    <p className="text-xs text-muted-foreground mb-4">Delete this project and all associated data.</p>
                    <Button variant="destructive" size="sm" onClick={handleDeleteProject}>Delete project</Button>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">You do not have permission to manage this project's settings.</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right sidebar - Properties panel */}
      {showSidebar && (
        <ProjectPropertiesSidebar
          project={project}
          currentStatus={currentStatus}
          currentPriority={currentPriority}
          leadName={leadName}
          orgMembers={orgMembers}
          teams={teams}
          canManageProject={canManageProject}
          handleStatusChange={handleStatusChange}
          handlePriorityChange={handlePriorityChange}
          handleLeadChange={handleLeadChange}
          handleToggleMember={handleToggleMember}
          handleToggleTeam={handleToggleTeam}
          handleDateChange={handleDateChange}
          memberSearch={memberSearch}
          setMemberSearch={setMemberSearch}
          projectFeatures={projectFeatures}
          navigate={navigate}
          setSelectedFeatureId={setSelectedFeatureId}
          projectIssues={projectIssues}
          completedIssues={completedIssues}
          progressPercent={progressPercent}
          assigneeStats={assigneeStats}
          sortedUpdates={sortedUpdates}
          user={user}
          currentUser={currentUser}
        />
      )}

      <MilestoneDialog 
        open={milestoneDialogOpen}
        onOpenChange={setMilestoneDialogOpen}
        title="Project Milestone"
        subtitle="Define a key phase for this project."
        onSave={handleAddMilestone}
      />

      {/* Resource Dialog */}
      <Dialog open={resourceDialogOpen} onOpenChange={setResourceDialogOpen}>
        <DialogContent className="sm:max-w-[500px] p-0 gap-0 bg-popover border-border overflow-hidden shadow-[0_0_80px_-12px_rgba(0,0,0,0.5)] outline-none rounded-2xl">
          <DialogTitle className="sr-only">Add Resource</DialogTitle>
          <DialogDescription className="sr-only">
            Add external links and documents to your project for easy access by the team.
          </DialogDescription>
          <motion.div 
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="flex flex-col"
          >
            <div className="px-6 py-3 border-b border-white/[0.03] flex items-center gap-2 text-[10px] font-bold text-white/20 uppercase tracking-[0.2em] bg-white/[0.01]">
              <span className="text-primary/60">Add External Resource</span>
            </div>

            <div className="p-8 space-y-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2 px-1">
                  <Tag className="h-3.5 w-3.5 text-white/20" />
                  <h3 className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em]">Resource Name</h3>
                </div>
                <input 
                  placeholder="e.g. Project Specification" 
                  value={resourceName} 
                  onChange={(e) => setResourceName(e.target.value)} 
                  className="w-full h-12 bg-white/[0.03] border border-white/[0.05] rounded-xl px-4 text-lg font-semibold text-white/90 focus:outline-none focus:border-primary/30 transition-colors"
                  autoFocus
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2 px-1">
                  <Link className="h-3.5 w-3.5 text-white/20" />
                  <h3 className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em]">URL</h3>
                </div>
                <input 
                  placeholder="https://docs.google.com/..." 
                  value={resourceUrl} 
                  onChange={(e) => setResourceUrl(e.target.value)} 
                  className="w-full h-12 bg-white/[0.03] border border-white/[0.05] rounded-xl px-4 text-xs font-mono text-primary/60 focus:outline-none focus:border-primary/30 transition-colors"
                />
              </div>
            </div>

            <div className="px-6 py-5 border-t border-white/[0.03] flex items-center justify-end bg-black/40 gap-3">
              <Button 
                type="button" 
                variant="glass" 
                onClick={() => setResourceDialogOpen(false)}
                className="h-9 text-[11px] font-bold px-5 transition-all uppercase tracking-wider"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleAddResource}
                variant="glass-primary"
                disabled={!resourceName.trim() || !resourceUrl.trim()}
                className="h-9 px-6 text-[11px] font-black transition-all disabled:opacity-20 disabled:shadow-none uppercase tracking-widest"
              >
                Add Resource
              </Button>
            </div>
          </motion.div>
        </DialogContent>
      </Dialog>

      {/* Feature Detail Sidebar */}
      <FeatureWindow.Detail 
        featureId={selectedFeatureId}
        features={features}
        projects={projects}
        onClose={() => setSelectedFeatureId(null)}
        onUpdateFeature={updateFeature}
        onDeleteFeature={deleteFeature}
        onAddMilestone={(id, parentId) => {
          setActiveFeatureId(id);
          setNewFeatureMilestoneParent(parentId);
          setCreateFeatureMilestoneOpen(true);
        }}
        onCreateIssueForMilestone={(_featureId, milestoneId) => {
          setSelectedMilestoneId(milestoneId);
          setCreateIssueOpen(true);
        }}
        onToggleMilestone={toggleFeatureMilestone}
        onUpdateMilestone={updateFeatureMilestone}
        onDeleteMilestone={deleteFeatureMilestone}
        onAddFeature={addFeature}
      />


      {/* Create Feature Dialog */}
      <Dialog open={createFeatureOpen} onOpenChange={setCreateFeatureOpen}>
        <DialogContent className="sm:max-w-[600px] p-0 gap-0 bg-popover border-border overflow-hidden shadow-[0_0_80px_-12px_rgba(0,0,0,0.5)] outline-none rounded-2xl">
          <DialogTitle className="sr-only">Create New Feature</DialogTitle>
          <DialogDescription className="sr-only">
            Features help you bundle related issues into meaningful user value.
          </DialogDescription>
          <motion.div 
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="flex flex-col"
          >
            <div className="px-6 py-3 border-b border-border flex items-center gap-2 text-[10px] font-bold text-muted-foreground/40 uppercase tracking-[0.2em] bg-muted/20">
              <span className="hover:text-muted-foreground/60 cursor-default transition-colors">{project.name}</span>
              <span className="opacity-30">/</span>
              <span className="text-primary/60">New Feature</span>
            </div>

            <div className="p-8 space-y-8">
              <div className="space-y-1">
                <input 
                  placeholder="Feature name (e.g. Real-time Collaboration)" 
                  value={newFeatureName}
                  onChange={(e) => setNewFeatureName(e.target.value)}
                  className="w-full text-3xl font-semibold bg-transparent border-none p-0 focus:outline-none placeholder:text-white/5 text-white/90 selection:bg-primary/30 tracking-tight" 
                  autoFocus 
                  onKeyDown={(e) => {
                    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                      handleAddFeature();
                    }
                  }}
                />
                <div className="h-px w-full bg-gradient-to-r from-primary/30 via-primary/5 to-transparent mt-1" />
              </div>
              <p className="text-sm text-white/30 leading-relaxed max-w-md">
                Features help you bundle related issues into meaningful user value.
              </p>
            </div>

            <div className="px-6 py-5 border-t border-border flex items-center justify-between bg-background/40">
              <div className="flex items-center gap-4 text-muted-foreground/40 select-none">
                <div className="flex items-center gap-1.5 opacity-50">
                  <div className="flex items-center gap-1 px-1.5 py-0.5 rounded border border-border bg-muted/30">
                    <span className="text-[9px] font-black">⌘</span>
                  </div>
                  <div className="flex items-center gap-1 px-1.5 py-0.5 rounded border border-border bg-muted/30">
                    <span className="text-[9px] font-black">ENTER</span>
                  </div>
                </div>
                <span className="text-[10px] font-bold tracking-widest uppercase opacity-20">Create Feature</span>
              </div>
              
              <div className="flex items-center gap-3">
                <Button 
                  type="button" 
                  variant="glass" 
                  onClick={() => setCreateFeatureOpen(false)}
                  className="h-9 text-[11px] font-bold px-5 transition-all uppercase tracking-wider"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleAddFeature}
                  variant="glass-primary"
                  disabled={!newFeatureName.trim()}
                  className="h-9 px-6 text-[11px] font-black transition-all disabled:opacity-20 disabled:shadow-none uppercase tracking-widest"
                >
                  Create Feature
                </Button>
              </div>
            </div>
          </motion.div>
        </DialogContent>
      </Dialog>

      <MilestoneDialog 
        open={createFeatureMilestoneOpen}
        onOpenChange={setCreateFeatureMilestoneOpen}
        title="Feature Milestone"
        subtitle="Break down this feature into granular delivery items."
        onSave={handleAddFeatureMilestone}
        initialData={{ parentId: newFeatureMilestoneParent }}
      />

      <CreateIssueDialog 
        open={createIssueOpen} 
        onOpenChange={(open) => {
            setCreateIssueOpen(open);
            if (!open) setSelectedMilestoneId(undefined);
        }}
        projects={projects}
        features={features}
        teams={teams}
        orgMembers={orgMembers}
        selectedProjectId={project.id}
        defaultMilestoneId={selectedMilestoneId}
        onAddIssue={async (data) => {
            await addIssue(data);
            setCreateIssueOpen(false);
            setSelectedMilestoneId(undefined);
            toast({ title: 'Issue created' });
        }}
      />
    </div>
  );
};

export default ProjectDetailPage;
