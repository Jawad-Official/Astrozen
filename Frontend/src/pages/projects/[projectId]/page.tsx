import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { useIssueStore } from '@/store/issueStore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { 
  CaretRight, 
  CaretDown,
  DotsThree, 
  Star, 
  Link,
  ChatTeardropText,
  Plus,
  Users,
  CalendarBlank,
  Tag,
  NotePencil,
  CircleHalf,
  Sliders,
  Check,
  WarningCircle,
  Circle,
  Stack,
  Diamond,
  X,
  Trash,
  ArrowSquareOut,
  User,
  Buildings,
  MagnifyingGlass,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Separator } from '@/components/ui/separator';
import { IssueStatus, ProjectStatus, ProjectHealth, ProjectPriority, Milestone, ProjectUpdate as ProjectUpdateType, ProjectResource, Issue, PRIORITY_CONFIG } from '@/types/issue';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Label } from '@/components/ui/label';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { useNavigate, useParams, useOutletContext } from 'react-router-dom';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { IssueBar } from '@/components/IssueBar';
import { ProjectBar } from '@/components/ProjectBar';
// Removed FeatureList import
import { StatusGroup } from '@/components/StatusGroup';
import { MilestoneDialog } from '@/components/dialogs/MilestoneDialog';
import { 
  PROJECT_STATUS_CONFIG, 
  PROJECT_PRIORITY_OPTIONS, 
  PROJECT_HEALTH_CONFIG,
} from '@/lib/constants';
import { PRIORITY_CONFIG as ISSUE_PRIORITY_CONFIG } from '@/types/issue';
import { featureService } from '@/services/features';
import { FeatureBar, FEATURE_STATUS_CONFIG } from '@/components/FeatureBar';
import { CreateIssueDialog } from '@/components/issue/CreateIssueDialog';
import { PROJECT_STATUS_OPTIONS, PROJECT_HEALTH_OPTIONS } from '@/lib/project-options';
import { teamService } from '@/services/teams';
import { userService, OrgMember } from '@/services/users';
import type { Team } from '@/types/auth';



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
    projects, features, issues, teams, orgMembers, updateProject, setSelectedIssue, currentUser, setSelectedProject,
    addProjectUpdate, deleteProjectUpdate, addProjectResource, deleteProjectResource,
    toggleProjectFavorite, fetchProject, addFeature, updateFeature, deleteFeature,
    addFeatureMilestone, updateFeatureMilestone, deleteFeatureMilestone, toggleFeatureMilestone,
    addUpdateComment, deleteUpdateComment, toggleUpdateReaction, toggleUpdateCommentReaction,
    fetchOrgMembers, fetchTeams, addIssue, selectedIssueId, updateIssue, deleteIssue
  } = useIssueStore();
  
  const { onCreateSubIssue } = useOutletContext<MainLayoutContext>();
  const project = projects.find(p => p.id === projectId);
  
  const [activeTab, setActiveTab] = useState('overview');
  const [updateContent, setUpdateContent] = useState('');
  const [selectedHealth, setSelectedHealth] = useState<ProjectHealth>('on_track');
  const [assigneesTab, setAssigneesTab] = useState<'assignees' | 'labels'>('assignees');
  
  // Update selected health when project loads
  useEffect(() => {
    if (project?.health) {
      setSelectedHealth(project.health);
    }
  }, [project?.id, project?.health]);

  const [milestoneDialogOpen, setMilestoneDialogOpen] = useState(false);
        const [milestoneName, setMilestoneName] = useState('');
        const [milestoneDescription, setMilestoneDescription] = useState('');
        const [milestoneDate, setMilestoneDate] = useState<Date | undefined>();
        
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
  const [newFeatureMilestoneName, setNewFeatureMilestoneName] = useState('');
  const [newFeatureMilestoneParent, setNewFeatureMilestoneParent] = useState<string | undefined>();
  
  const [createIssueOpen, setCreateIssueOpen] = useState(false);
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<string | undefined>();
      
        useEffect(() => {
          if (projectId) {
            setSelectedProject(projectId);
            fetchProject(projectId); // Fetch full project details including updates
            fetchOrgMembers();
            fetchTeams();
          }
        }, [projectId, setSelectedProject, fetchProject, fetchOrgMembers, fetchTeams]);
        
  
  const canManageProject = useMemo(() => {
    if (!user || !project) return false;
    
    // 1. Is org Admin
    const isAdmin = user.role === 'admin';
    if (isAdmin) return true;
    
    // 2. Is leader of any team assigned to the project
    // assigned teams are project.teamId (primary) and project.teams (contributors)
    const assignedTeamIds = [project.teamId, ...(project.teams || [])].filter(Boolean);
    
    // user.ledTeams (from backend context, assumed to be synced or we check user.roles)
    // Actually, we can check if user is in 'leader' role for any of those teams
    // Let's assume the teams list in store contains leader info or we use user.led_teams
    
    // Based on the new backend model, user has a collection of teams they lead.
    // If we don't have that in the frontend User object yet, we can check if 
    // any of the project's assigned teams list the current user as a leader.
    
    const isTeamLeader = teams.some(team => 
      assignedTeamIds.includes(team.id) && 
      team.leaders?.some(l => l.id === user.id)
    );
    
    return isTeamLeader;
  }, [user, project, teams]);

  // Sort updates by date descending (latest first)
  const sortedUpdates = useMemo(() => {
    if (!project?.updates) return [];
    return [...project.updates].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [project?.updates]);
  
  const projectFeatures = useMemo(() => 
    features.filter(f => f.projectId === projectId),
    [features, projectId]
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

  if (!project) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Project not found
      </div>
    );
  }

  // Helper function to get lead name from orgMembers
  const getLeadName = () => {
    if (!project.lead) return null;
    // First try to use leadName from backend
    if (project.leadName) return project.leadName;
    // Otherwise look up in orgMembers
    const leadMember = orgMembers.find(m => m.id === project.lead);
    return leadMember ? `${leadMember.first_name} ${leadMember.last_name}` : project.lead;
  };

  const leadName = getLeadName();

  const progressPercent = projectIssues.length > 0 
    ? Math.round((completedIssues / projectIssues.length) * 100) 
    : 0;

  const currentStatus = PROJECT_STATUS_OPTIONS.find(s => s.value === project.status) || PROJECT_STATUS_OPTIONS[0];
  const currentPriority = PROJECT_PRIORITY_OPTIONS.find(p => p.value === project.priority) || PROJECT_PRIORITY_OPTIONS[4];
  const currentHealth = PROJECT_HEALTH_OPTIONS.find(h => h.value === project.health) || PROJECT_HEALTH_OPTIONS[3];

  const handleStatusChange = async (status: ProjectStatus) => {
    try {
      await updateProject(project.id, { status });
      toast({ title: 'Status updated', description: `Project status changed to ${PROJECT_STATUS_OPTIONS.find(s => s.value === status)?.label}` });
    } catch (error: any) {
      toast({ 
        title: 'Failed to update status', 
        description: error.response?.data?.detail || 'An error occurred',
        variant: 'destructive' 
      });
    }
  };

  const handlePriorityChange = async (priority: ProjectPriority) => {
    try {
      await updateProject(project.id, { priority });
      toast({ title: 'Priority updated' });
    } catch (error: any) {
      toast({ 
        title: 'Failed to update priority', 
        description: error.response?.data?.detail || 'An error occurred',
        variant: 'destructive' 
      });
    }
  };

  const handleHealthChange = async (health: ProjectHealth) => {
    try {
      await updateProject(project.id, { health });
      toast({ title: 'Health updated' });
    } catch (error: any) {
      toast({ 
        title: 'Failed to update health', 
        description: error.response?.data?.detail || 'An error occurred',
        variant: 'destructive' 
      });
    }
  };

  const handleLeadChange = async (lead: string) => {
    try {
      await updateProject(project.id, { lead: lead || undefined });
      toast({ title: 'Lead updated' });
    } catch (error: any) {
      toast({ 
        title: 'Failed to update lead', 
        description: error.response?.data?.detail || 'An error occurred',
        variant: 'destructive' 
      });
    }
  };

  const handleAddMember = async (memberId: string) => {
    const currentMembers = project.members || [];
    if (currentMembers.includes(memberId)) return;
    const updatedMembers = [...currentMembers, memberId];
    try {
      await updateProject(project.id, { members: updatedMembers });
      toast({ title: 'Member added' });
      setMemberDialogOpen(false);
      setMemberSearch('');
    } catch (error: any) {
      toast({ 
        title: 'Failed to add member', 
        description: error.response?.data?.detail || 'An error occurred',
        variant: 'destructive' 
      });
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    const currentMembers = project.members || [];
    const updatedMembers = currentMembers.filter(m => m !== memberId);
    try {
      await updateProject(project.id, { members: updatedMembers });
      toast({ title: 'Member removed' });
    } catch (error: any) {
      toast({ 
        title: 'Failed to remove member', 
        description: error.response?.data?.detail || 'An error occurred',
        variant: 'destructive' 
      });
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
    } catch (error: any) {
      toast({ 
        title: `Failed to ${isMember ? 'remove' : 'add'} member`, 
        description: error.response?.data?.detail || 'An error occurred',
        variant: 'destructive' 
      });
    }
  };

  const handleToggleTeam = async (teamId: string) => {
    const teamsList = project.teams || [];
    const hasTeam = teamsList.includes(teamId);
    
    if (hasTeam && teamsList.length <= 1) {
      toast({ 
        title: 'Cannot remove team', 
        description: 'A project must have at least one team assigned.',
        variant: 'destructive'
      });
      return;
    }

    const updatedTeams = hasTeam 
      ? teamsList.filter(t => t !== teamId)
      : [...teamsList, teamId];
    
    try {
      await updateProject(project.id, { teams: updatedTeams });
      toast({ title: hasTeam ? 'Team removed' : 'Team added' });
    } catch (error: any) {
      toast({ 
        title: `Failed to ${hasTeam ? 'remove' : 'add'} team`, 
        description: error.response?.data?.detail || 'An error occurred',
        variant: 'destructive' 
      });
    }
  };

  const handleDateChange = async (field: 'startDate' | 'targetDate', date: Date | undefined) => {
    try {
      await updateProject(project.id, { [field]: date });
      toast({ title: `${field === 'startDate' ? 'Start' : 'Target'} date updated` });
    } catch (error: any) {
      toast({ 
        title: `Failed to update ${field === 'startDate' ? 'start' : 'target'} date`, 
        description: error.response?.data?.detail || 'An error occurred',
        variant: 'destructive' 
      });
    }
  };

  const handleAddMilestone = async (data: { name: string; description: string; targetDate?: string }) => {
    const newMilestone: Milestone = {
      id: Math.random().toString(36).substring(2, 9),
      name: data.name,
      description: data.description || undefined,
      targetDate: data.targetDate ? new Date(data.targetDate) : undefined,
      completed: false,
    };
    try {
      await updateProject(project.id, { 
        milestones: [...(project.milestones || []), newMilestone]
      });
      setMilestoneDialogOpen(false);
      toast({ title: 'Milestone added' });
    } catch (error: any) {
      toast({ 
        title: 'Failed to add milestone', 
        description: error.response?.data?.detail || 'An error occurred',
        variant: 'destructive' 
      });
    }
  };

  const handleToggleMilestone = async (milestoneId: string) => {
    const updatedMilestones = project.milestones.map(m => 
      m.id === milestoneId ? { ...m, completed: !m.completed } : m
    );
    try {
      await updateProject(project.id, { milestones: updatedMilestones });
    } catch (error: any) {
      toast({ 
        title: 'Failed to update milestone', 
        description: error.response?.data?.detail || 'An error occurred',
        variant: 'destructive' 
      });
    }
  };

  const handleDeleteMilestone = async (milestoneId: string) => {
    const updatedMilestones = project.milestones.filter(m => m.id !== milestoneId);
    try {
      await updateProject(project.id, { milestones: updatedMilestones });
      toast({ title: 'Milestone deleted' });
    } catch (error: any) {
      toast({ 
        title: 'Failed to delete milestone', 
        description: error.response?.data?.detail || 'An error occurred',
        variant: 'destructive' 
      });
    }
  };

  const handleAddResource = async () => {
    if (!resourceName.trim() || !resourceUrl.trim()) return;
    try {
      await addProjectResource(project.id, { 
        name: resourceName.trim(), 
        url: resourceUrl.trim(), 
        type: resourceUrl.includes('docs.') || resourceUrl.includes('.pdf') ? 'document' : 'link',
      });
      setResourceName('');
      setResourceUrl('');
      setResourceDialogOpen(false);
      toast({ title: 'Resource added' });
    } catch (error: any) {
      toast({ 
        title: 'Failed to add resource', 
        description: error.response?.data?.detail || 'An error occurred',
        variant: 'destructive' 
      });
    }
  };

  const handleDeleteResource = async (resourceId: string) => {
    try {
      await deleteProjectResource(project.id, resourceId);
      toast({ title: 'Resource deleted' });
    } catch (error: any) {
      toast({ 
        title: 'Failed to delete resource', 
        description: error.response?.data?.detail || 'An error occurred',
        variant: 'destructive' 
      });
    }
  };

  const handleSaveDescription = async () => {
    try {
      await updateProject(project.id, { description: descriptionDraft.trim() || undefined });
      setEditingDescription(false);
      toast({ title: 'Description updated' });
    } catch (error: any) {
      toast({ 
        title: 'Failed to update description', 
        description: error.response?.data?.detail || 'An error occurred',
        variant: 'destructive' 
      });
    }
  };

  const handleAddUpdate = async () => {
    if (!updateContent.trim()) return;
    try {
      await addProjectUpdate(project.id, { 
        content: updateContent.trim(),
        health: selectedHealth,
      });
      setUpdateContent('');
      toast({ title: 'Update posted' });
    } catch (error) {
      toast({ 
        title: 'Failed to post update', 
        description: 'Please try again',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteUpdate = async (updateId: string) => {
    try {
      await deleteProjectUpdate(project.id, updateId);
      toast({ title: 'Update deleted' });
    } catch (error: any) {
      toast({ 
        title: 'Failed to delete update', 
        description: error.response?.data?.detail || 'An error occurred',
        variant: 'destructive' 
      });
    }
  };

  const handleUpdateUpdate = async (updateId: string, updates: Partial<ProjectUpdateType>) => {
    const updatedUpdates = project.updates.map(u => 
      u.id === updateId ? { ...u, ...updates } : u
    );
    try {
      await updateProject(project.id, { updates: updatedUpdates });
    } catch (error: any) {
      toast({ 
        title: 'Failed to update update', 
        description: error.response?.data?.detail || 'An error occurred',
        variant: 'destructive' 
      });
    }
  };

  const handleAddUpdateComment = async (updateId: string, content: string, parentId?: string) => {
    try {
      await addUpdateComment(project.id, updateId, content, parentId);
    } catch (error: any) {
      toast({ 
        title: 'Failed to add comment', 
        description: error.response?.data?.detail || 'An error occurred',
        variant: 'destructive' 
      });
    }
  };

  const handleDeleteUpdateComment = async (updateId: string, commentId: string) => {
    try {
      await deleteUpdateComment(project.id, updateId, commentId);
    } catch (error: any) {
      toast({ 
        title: 'Failed to delete comment', 
        description: error.response?.data?.detail || 'An error occurred',
        variant: 'destructive' 
      });
    }
  };

  const handleToggleUpdateReaction = (updateId: string, emoji: string) => {
    toggleUpdateReaction(project.id, updateId, emoji);
  };

  const handleToggleUpdateCommentReaction = (updateId: string, commentId: string, emoji: string) => {
    toggleUpdateCommentReaction(project.id, updateId, commentId, emoji);
  };

  const handleAddFeature = async () => {
    if (!newFeatureName.trim()) return;
    try {
      await addFeature({
        name: newFeatureName.trim(),
        project_id: project.id,
        status: 'discovery'
      });
      setNewFeatureName('');
      setCreateFeatureOpen(false);
      toast({ title: 'Feature created successfully' });
    } catch (error) {
      toast({ title: 'Failed to create feature', variant: 'destructive' });
    }
  };

  const handleAddFeatureMilestone = async (data: { name: string; description: string; targetDate?: string; parentId?: string }) => {
    if (!activeFeatureId) return;
    await addFeatureMilestone(activeFeatureId, {
      name: data.name,
      description: data.description,
      targetDate: data.targetDate,
      parentId: data.parentId || undefined
    });
    setNewFeatureMilestoneName('');
    setNewFeatureMilestoneParent(undefined);
    setActiveFeatureId(null);
    setCreateFeatureMilestoneOpen(false);
    toast({ title: 'Milestone added' });
  };

  const getFlatMilestones = (featureId: string | null) => {
    if (!featureId) return [];
    const feature = features.find(f => f.id === featureId);
    if (!feature || !feature.milestones) return [];
    
    const flat: { id: string, name: string }[] = [];
    const recurse = (list: any[]) => {
      list.forEach(m => {
        flat.push({ id: m.id, name: m.name });
      });
    };
    recurse(feature.milestones);
    return flat;
  };

  const selectedFeature = features.find(f => f.id === selectedFeatureId);




  return (
    <div className="flex h-full">
      <div className="flex-1 flex flex-col overflow-hidden">
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
        </div>

        <div className="flex items-center gap-1 px-4 h-10 border-b border-border bg-background shrink-0">
          {['overview', 'updates', 'issues'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'px-3 py-1.5 text-sm rounded-md transition-colors flex items-center gap-1.5 capitalize',
                activeTab === tab ? 'bg-accent text-foreground' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {tab === 'overview' && <NotePencil className="h-3.5 w-3.5" />}
              {tab === 'updates' && <ChatTeardropText className="h-3.5 w-3.5" />}
              {tab === 'issues' && <CircleHalf className="h-3.5 w-3.5" />}
              {tab}
              {tab === 'updates' && project.updates?.length > 0 && (
                <span className="text-xs text-muted-foreground">({project.updates.length})</span>
              )}
            </button>
          ))}
          <button
            onClick={() => setActiveTab('settings')}
            className={cn(
              'px-3 py-1.5 text-sm rounded-md transition-colors',
              activeTab === 'settings' ? 'bg-accent text-foreground' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Sliders className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto bg-background">
          {activeTab === 'overview' && (
            <div className="max-w-3xl mx-auto py-8 px-6">
              <div className="mb-8">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-4xl">{project.icon}</span>
                </div>
                <h1 className="text-2xl font-semibold mb-2">{project.name}</h1>
                {editingDescription ? (
                  <div className="space-y-2">
                    <Textarea
                      value={descriptionDraft}
                      onChange={(e) => setDescriptionDraft(e.target.value)}
                      placeholder="Add a short summary..."
                      className="min-h-[80px] bg-card/50 border-border"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleSaveDescription}>Save</Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingDescription(false)}>Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <p 
                    className="text-muted-foreground text-sm cursor-pointer hover:text-foreground"
                    onClick={() => { setDescriptionDraft(project.description || ''); setEditingDescription(true); }}
                  >
                    {project.description || 'Add a short summary...'}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-3 mb-6 text-sm flex-wrap">
                <span className="text-muted-foreground">Properties</span>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Badge variant="outline" className="gap-1.5 text-xs cursor-pointer hover:bg-accent">
                      {currentStatus.icon}
                      {currentStatus.label}
                    </Badge>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="bg-popover border-border">
                    {PROJECT_STATUS_OPTIONS.map((opt) => (
                      <DropdownMenuItem key={opt.value} onClick={() => handleStatusChange(opt.value)} className="gap-2">
                        {opt.icon}
                        {opt.label}
                        {opt.value === project.status && <Check className="h-3 w-3 ml-auto" />}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Badge variant="outline" className={cn('h-6 px-2 text-[11px] font-bold uppercase border-white/5 bg-white/5 cursor-pointer hover:bg-white/10', currentPriority.color)}>
                      {currentPriority.label}
                    </Badge>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="bg-popover border-border">
                    {PROJECT_PRIORITY_OPTIONS.map((opt) => (
                      <DropdownMenuItem key={opt.value} onClick={() => handlePriorityChange(opt.value)} className={cn('gap-2', opt.color)}>
                        {opt.label}
                        {opt.value === project.priority && <Check className="h-3 w-3 ml-auto" />}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild disabled={!canManageProject}>
                    <span className={cn(
                      "flex items-center gap-1.5 cursor-pointer hover:text-foreground",
                      !canManageProject && "opacity-50 cursor-not-allowed"
                    )}>
                      <Users className="h-3.5 w-3.5" />
                      {leadName || 'Lead'}
                    </span>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="bg-popover border-border">
                    <DropdownMenuItem onClick={() => handleLeadChange('')}>No lead</DropdownMenuItem>
                    {orgMembers.map((member) => (
                      <DropdownMenuItem key={member.id} onClick={() => handleLeadChange(member.id)}>
                        {member.full_name}
                        {member.id === project.lead && <Check className="h-3 w-3 ml-auto" />}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild disabled={!canManageProject}>
                    <span className={cn(
                      "text-muted-foreground flex items-center gap-1.5 cursor-pointer hover:text-foreground",
                      !canManageProject && "opacity-50 cursor-not-allowed"
                    )}>
                      <Users className="h-3.5 w-3.5" />
                      {project.teams?.length > 0 
                        ? project.teams.map(tid => {
                            const t = teams.find(team => team.id === tid);
                            if (!t) return tid;
                            return project.teams.length > 1 ? t.identifier : t.name;
                          }).join(', ')
                        : 'Teams'}
                    </span>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="bg-popover border-border">
                    {teams.map((team) => (
                      <DropdownMenuItem key={team.id} onClick={() => handleToggleTeam(team.id)} className="gap-2">
                        <Users className="h-3.5 w-3.5 text-muted-foreground" />
                        {team.name}
                        {project.teams?.includes(team.id) && <Check className="h-3 w-3 ml-auto" />}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                <Popover>
                  <PopoverTrigger asChild>
                    <span className="text-muted-foreground flex items-center gap-1.5 cursor-pointer hover:text-foreground">
                      <CalendarBlank className="h-3.5 w-3.5" />
                      {project.targetDate ? format(new Date(project.targetDate), 'MMM d, yyyy') : 'Target date'}
                    </span>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-popover border-border" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={project.targetDate ? new Date(project.targetDate) : undefined}
                      onSelect={(date) => handleDateChange('targetDate', date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="mb-8">
                <p className="text-muted-foreground text-sm mb-3">Resources</p>
                <div className="space-y-2 mb-2">
                  {project.resources?.map((resource) => (
                    <div key={resource.id} className="flex items-center gap-2 text-sm group">
                      <Link className="h-3.5 w-3.5 text-muted-foreground" />
                      <a href={resource.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
                        {resource.name}
                        <ArrowSquareOut className="h-3 w-3" />
                      </a>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-5 w-5 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDeleteResource(resource.id)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
                <Button variant="ghost" size="sm" className="text-muted-foreground gap-1.5" onClick={() => setResourceDialogOpen(true)}>
                  <Plus className="h-3.5 w-3.5" />
                  Add document or link...
                </Button>
              </div>

              {(!sortedUpdates || sortedUpdates.length === 0) ? (
                <div 
                  className="bg-card/30 rounded-lg p-6 mb-8 flex items-center justify-center border border-border border-dashed cursor-pointer hover:bg-card/50 transition-colors"
                  onClick={() => setActiveTab('updates')}
                >
                  <Button variant="ghost" className="gap-2 text-muted-foreground hover:text-foreground">
                    <NotePencil className="h-4 w-4" />
                    Write first project update
                  </Button>
                </div>
              ) : (
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium">Latest update</h3>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 text-xs gap-1 text-muted-foreground"
                      onClick={() => setActiveTab('updates')}
                    >
                      View all ({sortedUpdates.length})
                    </Button>
                  </div>
                  <ProjectBar.UpdateCard 
                    update={sortedUpdates[0]} 
                    onDelete={() => handleDeleteUpdate(sortedUpdates[0].id)}
                    onUpdate={(updates) => handleUpdateUpdate(sortedUpdates[0].id, updates)}
                    currentUser={user?.id || currentUser || ''}
                    onAddComment={(content, parentId) => handleAddUpdateComment(sortedUpdates[0].id, content, parentId)}
                    onDeleteComment={(commentId) => handleDeleteUpdateComment(sortedUpdates[0].id, commentId)}
                    onToggleReaction={(emoji) => handleToggleUpdateReaction(sortedUpdates[0].id, emoji)}
                    onToggleCommentReaction={(commentId, emoji) => handleToggleUpdateCommentReaction(sortedUpdates[0].id, commentId, emoji)}
                  />
                </div>
              )}

              <div className="mb-8">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium">Features</h3>
                  <Button variant="ghost" size="sm" className="h-6 text-xs gap-1" onClick={() => setCreateFeatureOpen(true)}>
                    <Plus className="h-3 w-3" />
                     New Feature
                  </Button>
                </div>
                <div className="bg-[#090909] rounded-xl border border-white/5 overflow-hidden">
                  <FeatureBar.List 
                    features={projectFeatures}
                    projects={projects}
                    onUpdateFeature={updateFeature}
                    onDeleteFeature={deleteFeature}
                    onSelectFeature={setSelectedFeatureId}
                    onAddMilestone={(id, parentId) => {
                      setActiveFeatureId(id);
                      setNewFeatureMilestoneParent(parentId);
                      setCreateFeatureMilestoneOpen(true);
                    }}
                    onCreateIssueForMilestone={(featureId, milestoneId) => {
                      setSelectedMilestoneId(milestoneId);
                      setCreateIssueOpen(true);
                    }}
                    onToggleMilestone={toggleFeatureMilestone}
                    onUpdateMilestone={updateFeatureMilestone}
                    onDeleteMilestone={deleteFeatureMilestone}
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'updates' && (
            <div className="max-w-3xl mx-auto py-8 px-6">
              {/* New update input */}
              <div className="bg-card/50 rounded-lg border border-border p-4 mb-8">
                <div className="flex items-center gap-2 mb-3">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Badge 
                        variant="outline" 
                        className={cn('gap-1.5 text-xs cursor-pointer', PROJECT_HEALTH_OPTIONS.find(h => h.value === selectedHealth)?.className)}
                      >
                        {PROJECT_HEALTH_OPTIONS.find(h => h.value === selectedHealth)?.icon}
                        {PROJECT_HEALTH_OPTIONS.find(h => h.value === selectedHealth)?.label}
                      </Badge>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="bg-popover border-border">
                      {PROJECT_HEALTH_OPTIONS.map((opt) => (
                        <DropdownMenuItem key={opt.value} onClick={() => setSelectedHealth(opt.value)} className="gap-2">
                          {opt.icon}
                          {opt.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <Textarea
                  placeholder="Write a project update..."
                  value={updateContent}
                  onChange={(e) => setUpdateContent(e.target.value)}
                  className="min-h-[80px] bg-transparent border-0 resize-none focus-visible:ring-0 p-0 placeholder:text-muted-foreground"
                />
                {updateContent.trim() && (
                  <div className="flex justify-end mt-3">
                    <Button size="sm" onClick={handleAddUpdate}>Post update</Button>
                  </div>
                )}
              </div>

              {/* Updates timeline */}
              <div className="space-y-6">
                {sortedUpdates.map((update) => (
                  <ProjectBar.UpdateCard 
                    key={update.id} 
                    update={update} 
                    onDelete={() => handleDeleteUpdate(update.id)}
                    onUpdate={(updates) => handleUpdateUpdate(update.id, updates)}
                    currentUser={user?.id || currentUser || ''}
                    onAddComment={(content, parentId) => handleAddUpdateComment(update.id, content, parentId)}
                    onDeleteComment={(commentId) => handleDeleteUpdateComment(update.id, commentId)}
                    onToggleReaction={(emoji) => handleToggleUpdateReaction(update.id, emoji)}
                    onToggleCommentReaction={(commentId, emoji) => handleToggleUpdateCommentReaction(update.id, commentId, emoji)}
                  />
                ))}
                
                {/* Created activity */}
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <MagnifyingGlass className="h-3.5 w-3.5" />
                  <span>{user?.fullName || currentUser} created the project · {format(new Date(project.createdAt), 'MMM d')}</span>
                </div>
              </div>
            </div>
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
                    <Button variant="destructive" size="sm">Delete project</Button>
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
                <Badge variant="outline" className={cn('h-6 px-2 text-[11px] font-bold uppercase border-white/5 bg-white/5 cursor-pointer hover:bg-white/10', currentPriority.color)}>
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
                      <div className="h-5 w-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-[9px] font-bold border border-emerald-500/10 shadow-inner group-hover:scale-110 transition-transform">
                        {leadName && typeof leadName === 'string' ? leadName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() : '?'}
                      </div>
                      <span className="text-xs font-medium text-white/70 group-hover:text-white transition-colors">{leadName}</span>
                    </>
                  ) : (
                    <>
                      <User className="h-3.5 w-3.5 text-white/20" />
                      <span className="text-xs text-white/20 hover:text-white/40 transition-colors font-medium">Add lead...</span>
                    </>
                  )}
                </span>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-[#0C0C0C] border-white/10 w-56 p-1 shadow-2xl">
                <DropdownMenuItem key="no-lead" onClick={() => handleLeadChange('')} className="text-xs focus:bg-white/5 py-2">
                  <div className="flex items-center gap-2 text-white/40">
                    <User className="h-3.5 w-3.5" />
                    No lead
                  </div>
                </DropdownMenuItem>
                <Separator className="bg-white/5 my-1" />
                <div className="px-2 py-1.5 text-[10px] font-black text-white/20 uppercase tracking-widest">Assign Lead</div>
                {orgMembers.map((member) => (
                  <DropdownMenuItem key={member.id} onClick={() => handleLeadChange(member.id)} className="text-xs focus:bg-white/5 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[10px] font-bold border border-primary/10 shadow-inner">
                        {member.first_name[0]}{member.last_name[0]}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-semibold text-white/80 truncate">{member.full_name}</span>
                        <span className="text-[10px] text-white/20 truncate">{member.email}</span>
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
              <span className="text-[11px] font-bold text-white/20 uppercase tracking-[0.15em] flex items-center gap-1.5">
                Members
              </span>
              {canManageProject && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-5 w-5 hover:bg-white/5 text-white/20 hover:text-white transition-colors" 
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent side="left" align="start" className="w-64 p-0 bg-[#0C0C0C] border-white/10 shadow-2xl overflow-hidden rounded-xl">
                    <div className="p-2 border-b border-white/5 bg-white/[0.01]">
                      <div className="relative group">
                        <MagnifyingGlass className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/20 group-focus-within:text-primary transition-colors" />
                        <input 
                          value={memberSearch} 
                          onChange={(e) => setMemberSearch(e.target.value)} 
                          placeholder="Search teammates..."
                          className="w-full h-8 bg-white/5 border border-white/5 rounded-md pl-8 pr-2 text-xs text-white/80 focus:outline-none focus:border-primary/30 transition-colors placeholder:text-white/10 font-medium"
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
                              className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-white/5 transition-all text-left group"
                            >
                              <div className={cn(
                                "h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-bold border shadow-inner transition-all",
                                isAssigned 
                                  ? "bg-primary/20 border-primary/30 text-primary scale-105 shadow-[0_0_15px_rgba(var(--primary-rgb),0.2)]" 
                                  : "bg-white/5 border-white/5 text-white/40 group-hover:bg-white/10 group-hover:text-white/60"
                              )}>
                                {member.first_name[0]}{member.last_name[0]}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-[11px] font-semibold text-white/80 truncate tracking-tight">{member.full_name}</div>
                                <div className="text-[10px] text-white/20 truncate font-medium">{member.email}</div>
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
                        <div className="py-8 text-center text-[10px] text-white/20 font-medium italic">
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
                          <div className="h-7 w-7 rounded-full bg-primary/5 border border-white/5 flex items-center justify-center text-primary/60 text-[10px] font-bold shadow-inner cursor-default hover:scale-110 hover:bg-primary/10 hover:border-primary/20 hover:text-primary transition-all duration-300 ring-1 ring-transparent hover:ring-primary/10">
                            {m.first_name[0]}{m.last_name[0]}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-[10px] bg-zinc-900 border-white/10 text-white font-medium px-2 py-1 shadow-2xl">
                          {m.full_name}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  );
                })
              ) : (
                <span className="text-[11px] text-white/10 italic font-medium">No collaborators assigned</span>
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
                      <div className="h-5 w-5 rounded bg-zinc-800 flex items-center justify-center text-[9px] font-bold text-zinc-400">
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
                        {stat.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
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

      <MilestoneDialog 
        open={milestoneDialogOpen}
        onOpenChange={setMilestoneDialogOpen}
        title="Project Milestone"
        subtitle="Define a key phase for this project."
        onSave={handleAddMilestone}
      />

      {/* Resource Dialog */}
      <Dialog open={resourceDialogOpen} onOpenChange={setResourceDialogOpen}>
        <DialogContent className="sm:max-w-[500px] p-0 gap-0 bg-[#080808] border-white/[0.08] overflow-hidden shadow-[0_0_80px_-12px_rgba(0,0,0,0.7)] outline-none rounded-2xl">
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
      <FeatureBar.Detail 
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
        onCreateIssueForMilestone={(featureId, milestoneId) => {
          setSelectedMilestoneId(milestoneId);
          setCreateIssueOpen(true);
        }}
        onToggleMilestone={toggleFeatureMilestone}
        onUpdateMilestone={updateFeatureMilestone}
        onDeleteMilestone={deleteFeatureMilestone}
      />


      {/* Create Feature Dialog */}
      <Dialog open={createFeatureOpen} onOpenChange={setCreateFeatureOpen}>
        <DialogContent className="sm:max-w-[600px] p-0 gap-0 bg-[#080808] border-white/[0.08] overflow-hidden shadow-[0_0_80px_-12px_rgba(0,0,0,0.7)] outline-none rounded-2xl">
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
            <div className="px-6 py-3 border-b border-white/[0.03] flex items-center gap-2 text-[10px] font-bold text-white/20 uppercase tracking-[0.2em] bg-white/[0.01]">
              <span className="hover:text-white/40 cursor-default transition-colors">{project.name}</span>
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

            <div className="px-6 py-5 border-t border-white/[0.03] flex items-center justify-between bg-black/40">
              <div className="flex items-center gap-4 text-white/10 select-none">
                <div className="flex items-center gap-1.5 opacity-50">
                  <div className="flex items-center gap-1 px-1.5 py-0.5 rounded border border-white/10 bg-white/[0.02]">
                    <span className="text-[9px] font-black">⌘</span>
                  </div>
                  <div className="flex items-center gap-1 px-1.5 py-0.5 rounded border border-white/10 bg-white/[0.02]">
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
