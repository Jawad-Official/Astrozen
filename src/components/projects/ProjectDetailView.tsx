import { useState, useMemo } from 'react';
import { useIssueStore } from '@/store/issueStore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
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
  X,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Separator } from '@/components/ui/separator';
import { StatusIcon } from '@/components/issues/StatusIcon';
import { IssueStatus, ProjectStatus, ProjectHealth, ProjectPriority, Milestone, ProjectUpdate as ProjectUpdateType, ProjectResource } from '@/types/issue';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';

const statusOptions: { value: ProjectStatus; label: string; icon: React.ReactNode }[] = [
  { value: 'backlog', label: 'Backlog', icon: <Circle className="h-3 w-3 text-muted-foreground" /> },
  { value: 'planned', label: 'Planned', icon: <Circle className="h-3 w-3 text-blue-400" /> },
  { value: 'in_progress', label: 'In Progress', icon: <CircleDot className="h-3 w-3 text-yellow-400" /> },
  { value: 'paused', label: 'Paused', icon: <Circle className="h-3 w-3 text-orange-400" /> },
  { value: 'completed', label: 'Completed', icon: <Check className="h-3 w-3 text-emerald-400" /> },
  { value: 'cancelled', label: 'Cancelled', icon: <X className="h-3 w-3 text-red-400" /> },
];

const priorityOptions: { value: ProjectPriority; label: string; color: string }[] = [
  { value: 'urgent', label: 'Urgent', color: 'text-red-400' },
  { value: 'high', label: 'High', color: 'text-orange-400' },
  { value: 'medium', label: 'Medium', color: 'text-yellow-400' },
  { value: 'low', label: 'Low', color: 'text-blue-400' },
  { value: 'none', label: 'No priority', color: 'text-muted-foreground' },
];

const healthOptions: { value: ProjectHealth; label: string; icon: React.ReactNode; className: string }[] = [
  { value: 'on_track', label: 'On track', icon: <Check className="h-3 w-3" />, className: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  { value: 'at_risk', label: 'At risk', icon: <AlertCircle className="h-3 w-3" />, className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  { value: 'off_track', label: 'Off track', icon: <AlertCircle className="h-3 w-3" />, className: 'bg-red-500/20 text-red-400 border-red-500/30' },
  { value: 'no_updates', label: 'No updates', icon: <Circle className="h-3 w-3" />, className: 'bg-muted text-muted-foreground border-border' },
];

// Status group component for issues tab
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

// Project update card component
function ProjectUpdateCard({ update, onDelete }: { update: ProjectUpdateType; onDelete: () => void }) {
  const health = healthOptions.find(h => h.value === update.health) || healthOptions[3];
  
  return (
    <div className="bg-card/50 rounded-lg border border-border p-4 group">
      <div className="flex items-center gap-3 mb-3">
        <Badge variant="outline" className={cn('gap-1.5 text-xs', health.className)}>
          {health.icon}
          {health.label}
        </Badge>
        <div className="flex items-center gap-2 text-sm text-muted-foreground flex-1">
          <div className="h-5 w-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-[9px] font-medium">
            {update.author.split(' ').map(n => n[0]).join('').slice(0, 2)}
          </div>
          <span>{update.author}</span>
          <span>·</span>
          <span>{format(update.createdAt, 'MMM d')}</span>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
          onClick={onDelete}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
      <p className="text-sm text-foreground whitespace-pre-wrap">{update.content}</p>
    </div>
  );
}

export function ProjectDetailView() {
  const { toast } = useToast();
  const { selectedProjectId, projects, issues, setCurrentView, updateProject, setSelectedIssue, currentUser } = useIssueStore();
  const [activeTab, setActiveTab] = useState('overview');
  const [updateContent, setUpdateContent] = useState('');
  const [selectedHealth, setSelectedHealth] = useState<ProjectHealth>('on_track');
  const [assigneesTab, setAssigneesTab] = useState<'assignees' | 'labels'>('assignees');
  
  // Dialog states
  const [milestoneDialogOpen, setMilestoneDialogOpen] = useState(false);
  const [milestoneName, setMilestoneName] = useState('');
  const [milestoneDescription, setMilestoneDescription] = useState('');
  const [milestoneDate, setMilestoneDate] = useState<Date | undefined>();
  
  const [resourceDialogOpen, setResourceDialogOpen] = useState(false);
  const [resourceName, setResourceName] = useState('');
  const [resourceUrl, setResourceUrl] = useState('');
  
  const [memberDialogOpen, setMemberDialogOpen] = useState(false);
  const [newMember, setNewMember] = useState('');
  
  const [editingDescription, setEditingDescription] = useState(false);
  const [descriptionDraft, setDescriptionDraft] = useState('');
  
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

  const currentStatus = statusOptions.find(s => s.value === project.status) || statusOptions[0];
  const currentPriority = priorityOptions.find(p => p.value === project.priority) || priorityOptions[4];
  const currentHealth = healthOptions.find(h => h.value === project.health) || healthOptions[3];

  // Handlers
  const handleStatusChange = (status: ProjectStatus) => {
    updateProject(project.id, { status, updatedAt: new Date() });
    toast({ title: 'Status updated', description: `Project status changed to ${statusOptions.find(s => s.value === status)?.label}` });
  };

  const handlePriorityChange = (priority: ProjectPriority) => {
    updateProject(project.id, { priority, updatedAt: new Date() });
    toast({ title: 'Priority updated' });
  };

  const handleHealthChange = (health: ProjectHealth) => {
    updateProject(project.id, { health, updatedAt: new Date() });
  };

  const handleLeadChange = (lead: string) => {
    updateProject(project.id, { lead: lead || undefined, updatedAt: new Date() });
    toast({ title: 'Lead updated' });
  };

  const handleAddMember = () => {
    if (!newMember.trim()) return;
    const updatedMembers = [...(project.members || []), newMember.trim()];
    updateProject(project.id, { members: updatedMembers, updatedAt: new Date() });
    setNewMember('');
    setMemberDialogOpen(false);
    toast({ title: 'Member added' });
  };

  const handleRemoveMember = (member: string) => {
    const updatedMembers = project.members.filter(m => m !== member);
    updateProject(project.id, { members: updatedMembers, updatedAt: new Date() });
    toast({ title: 'Member removed' });
  };

  const handleDateChange = (field: 'startDate' | 'targetDate', date: Date | undefined) => {
    updateProject(project.id, { [field]: date, updatedAt: new Date() });
    toast({ title: `${field === 'startDate' ? 'Start' : 'Target'} date updated` });
  };

  const handleAddMilestone = () => {
    if (!milestoneName.trim()) return;
    const newMilestone: Milestone = {
      id: Math.random().toString(36).substring(2, 9),
      name: milestoneName.trim(),
      description: milestoneDescription.trim() || undefined,
      targetDate: milestoneDate,
      completed: false,
    };
    updateProject(project.id, { 
      milestones: [...(project.milestones || []), newMilestone],
      updatedAt: new Date(),
    });
    setMilestoneName('');
    setMilestoneDescription('');
    setMilestoneDate(undefined);
    setMilestoneDialogOpen(false);
    toast({ title: 'Milestone added' });
  };

  const handleToggleMilestone = (milestoneId: string) => {
    const updatedMilestones = project.milestones.map(m => 
      m.id === milestoneId ? { ...m, completed: !m.completed } : m
    );
    updateProject(project.id, { milestones: updatedMilestones, updatedAt: new Date() });
  };

  const handleDeleteMilestone = (milestoneId: string) => {
    const updatedMilestones = project.milestones.filter(m => m.id !== milestoneId);
    updateProject(project.id, { milestones: updatedMilestones, updatedAt: new Date() });
    toast({ title: 'Milestone deleted' });
  };

  const handleAddResource = () => {
    if (!resourceName.trim() || !resourceUrl.trim()) return;
    const newResource: ProjectResource = {
      id: Math.random().toString(36).substring(2, 9),
      name: resourceName.trim(),
      url: resourceUrl.trim(),
      type: resourceUrl.includes('docs.') || resourceUrl.includes('.pdf') ? 'document' : 'link',
    };
    updateProject(project.id, { 
      resources: [...(project.resources || []), newResource],
      updatedAt: new Date(),
    });
    setResourceName('');
    setResourceUrl('');
    setResourceDialogOpen(false);
    toast({ title: 'Resource added' });
  };

  const handleDeleteResource = (resourceId: string) => {
    const updatedResources = project.resources.filter(r => r.id !== resourceId);
    updateProject(project.id, { resources: updatedResources, updatedAt: new Date() });
    toast({ title: 'Resource deleted' });
  };

  const handleSaveDescription = () => {
    updateProject(project.id, { description: descriptionDraft.trim() || undefined, updatedAt: new Date() });
    setEditingDescription(false);
    toast({ title: 'Description updated' });
  };

  const handleAddUpdate = () => {
    if (!updateContent.trim()) return;
    const newUpdate: ProjectUpdateType = {
      id: Math.random().toString(36).substring(2, 9),
      projectId: project.id,
      health: selectedHealth,
      content: updateContent.trim(),
      author: currentUser,
      createdAt: new Date(),
    };
    updateProject(project.id, { 
      updates: [newUpdate, ...(project.updates || [])],
      health: selectedHealth,
      updatedAt: new Date(),
    });
    setUpdateContent('');
    toast({ title: 'Update posted' });
  };

  const handleDeleteUpdate = (updateId: string) => {
    const updatedUpdates = project.updates.filter(u => u.id !== updateId);
    updateProject(project.id, { updates: updatedUpdates, updatedAt: new Date() });
    toast({ title: 'Update deleted' });
  };

  // Calculate assignee stats
  const assigneeStats = useMemo(() => {
    const stats: Record<string, { total: number; completed: number }> = {};
    projectIssues.forEach(issue => {
      const assignee = issue.assignee || 'Unassigned';
      if (!stats[assignee]) stats[assignee] = { total: 0, completed: 0 };
      stats[assignee].total++;
      if (issue.status === 'done') stats[assignee].completed++;
    });
    return Object.entries(stats).map(([name, data]) => ({
      name,
      ...data,
      percent: data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0,
    }));
  }, [projectIssues]);

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
            <span className="text-lg">{project.icon}</span>
            {project.name}
          </span>
          <Star className="h-3.5 w-3.5 text-muted-foreground ml-1 cursor-pointer hover:text-yellow-400" />
          <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground ml-1 cursor-pointer hover:text-foreground" />
          
          <div className="flex-1" />
          
          <Badge variant="outline" className={cn('gap-1.5 text-xs', currentHealth.className)}>
            {currentHealth.icon}
            {currentHealth.label}
          </Badge>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 px-4 h-10 border-b border-border">
          {['overview', 'updates', 'issues'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'px-3 py-1.5 text-sm rounded-md transition-colors flex items-center gap-1.5 capitalize',
                activeTab === tab ? 'bg-accent text-foreground' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {tab === 'overview' && <PenSquare className="h-3.5 w-3.5" />}
              {tab === 'updates' && <MessageSquare className="h-3.5 w-3.5" />}
              {tab === 'issues' && <CircleDot className="h-3.5 w-3.5" />}
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
            <Settings2 className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
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

              {/* Properties row */}
              <div className="flex items-center gap-3 mb-6 text-sm flex-wrap">
                <span className="text-muted-foreground">Properties</span>
                
                {/* Status dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Badge variant="outline" className="gap-1.5 text-xs cursor-pointer hover:bg-accent">
                      {currentStatus.icon}
                      {currentStatus.label}
                    </Badge>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="bg-popover border-border">
                    {statusOptions.map((opt) => (
                      <DropdownMenuItem key={opt.value} onClick={() => handleStatusChange(opt.value)} className="gap-2">
                        {opt.icon}
                        {opt.label}
                        {opt.value === project.status && <Check className="h-3 w-3 ml-auto" />}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Priority dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <span className={cn('flex items-center gap-1.5 cursor-pointer hover:opacity-80', currentPriority.color)}>
                      <MoreHorizontal className="h-3.5 w-3.5" />
                      {currentPriority.label}
                    </span>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="bg-popover border-border">
                    {priorityOptions.map((opt) => (
                      <DropdownMenuItem key={opt.value} onClick={() => handlePriorityChange(opt.value)} className={cn('gap-2', opt.color)}>
                        {opt.label}
                        {opt.value === project.priority && <Check className="h-3 w-3 ml-auto" />}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Lead */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <span className="text-muted-foreground flex items-center gap-1.5 cursor-pointer hover:text-foreground">
                      <Users className="h-3.5 w-3.5" />
                      {project.lead || 'Lead'}
                    </span>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="bg-popover border-border">
                    <DropdownMenuItem onClick={() => handleLeadChange('')}>No lead</DropdownMenuItem>
                    {['John Doe', 'Jane Smith', 'jawadcoder0'].map((name) => (
                      <DropdownMenuItem key={name} onClick={() => handleLeadChange(name)}>
                        {name}
                        {name === project.lead && <Check className="h-3 w-3 ml-auto" />}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Target date */}
                <Popover>
                  <PopoverTrigger asChild>
                    <span className="text-muted-foreground flex items-center gap-1.5 cursor-pointer hover:text-foreground">
                      <Calendar className="h-3.5 w-3.5" />
                      {project.targetDate ? format(project.targetDate, 'MMM d, yyyy') : 'Target date'}
                    </span>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-popover border-border" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={project.targetDate}
                      onSelect={(date) => handleDateChange('targetDate', date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Resources */}
              <div className="mb-8">
                <p className="text-muted-foreground text-sm mb-3">Resources</p>
                <div className="space-y-2 mb-2">
                  {project.resources?.map((resource) => (
                    <div key={resource.id} className="flex items-center gap-2 text-sm group">
                      <Link2 className="h-3.5 w-3.5 text-muted-foreground" />
                      <a href={resource.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
                        {resource.name}
                        <ExternalLink className="h-3 w-3" />
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

              {/* Write update CTA */}
              {(!project.updates || project.updates.length === 0) && (
                <div 
                  className="bg-card/30 rounded-lg p-6 mb-8 flex items-center justify-center border border-border border-dashed cursor-pointer hover:bg-card/50 transition-colors"
                  onClick={() => setActiveTab('updates')}
                >
                  <Button variant="ghost" className="gap-2 text-muted-foreground hover:text-foreground">
                    <PenSquare className="h-4 w-4" />
                    Write first project update
                  </Button>
                </div>
              )}

              {/* Milestones */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium">Milestones</h3>
                  <Button variant="ghost" size="sm" className="h-6 text-xs gap-1" onClick={() => setMilestoneDialogOpen(true)}>
                    <Plus className="h-3 w-3" />
                    Add
                  </Button>
                </div>
                {project.milestones?.length > 0 ? (
                  <div className="space-y-2">
                    {project.milestones.map((milestone) => (
                      <div key={milestone.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-accent/50 group">
                        <button 
                          onClick={() => handleToggleMilestone(milestone.id)}
                          className={cn(
                            'h-4 w-4 rounded border flex items-center justify-center transition-colors',
                            milestone.completed ? 'bg-emerald-500 border-emerald-500' : 'border-muted-foreground hover:border-foreground'
                          )}
                        >
                          {milestone.completed && <Check className="h-3 w-3 text-white" />}
                        </button>
                        <Diamond className={cn('h-4 w-4', milestone.completed ? 'text-emerald-400' : 'text-yellow-400')} />
                        <span className={cn('text-sm flex-1', milestone.completed && 'line-through text-muted-foreground')}>
                          {milestone.name}
                        </span>
                        {milestone.targetDate && (
                          <span className="text-xs text-muted-foreground">{format(milestone.targetDate, 'MMM d')}</span>
                        )}
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDeleteMilestone(milestone.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">No milestones yet</p>
                )}
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
                        className={cn('gap-1.5 text-xs cursor-pointer', healthOptions.find(h => h.value === selectedHealth)?.className)}
                      >
                        {healthOptions.find(h => h.value === selectedHealth)?.icon}
                        {healthOptions.find(h => h.value === selectedHealth)?.label}
                      </Badge>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="bg-popover border-border">
                      {healthOptions.map((opt) => (
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
                {project.updates?.map((update) => (
                  <ProjectUpdateCard 
                    key={update.id} 
                    update={update} 
                    onDelete={() => handleDeleteUpdate(update.id)}
                  />
                ))}
                
                {/* Created activity */}
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Layers className="h-4 w-4" />
                  <span>{currentUser} created the project · {format(project.createdAt, 'MMM d')}</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'issues' && (
            <div className="py-2">
              <StatusGroup status="backlog" label="Backlog" issues={projectIssues} onIssueClick={setSelectedIssue} />
              <StatusGroup status="todo" label="Todo" issues={projectIssues} onIssueClick={setSelectedIssue} />
              <StatusGroup status="in_progress" label="In Progress" issues={projectIssues} onIssueClick={setSelectedIssue} />
              <StatusGroup status="done" label="Done" issues={projectIssues} onIssueClick={setSelectedIssue} defaultExpanded={false} />
              <StatusGroup status="cancelled" label="Cancelled" issues={projectIssues} onIssueClick={setSelectedIssue} defaultExpanded={false} />
              
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
                <div className="bg-card/50 border border-border rounded-lg p-4">
                  <h3 className="text-sm font-medium mb-2">Danger zone</h3>
                  <p className="text-xs text-muted-foreground mb-4">Delete this project and all associated data.</p>
                  <Button variant="destructive" size="sm">Delete project</Button>
                </div>
              </div>
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
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
                {statusOptions.map((opt) => (
                  <DropdownMenuItem key={opt.value} onClick={() => handleStatusChange(opt.value)} className="gap-2">
                    {opt.icon}
                    {opt.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Priority */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Priority</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <span className={cn('flex items-center gap-1.5 cursor-pointer', currentPriority.color)}>
                  <AlertCircle className="h-3.5 w-3.5" />
                  {currentPriority.label}
                </span>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-popover border-border">
                {priorityOptions.map((opt) => (
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
              <DropdownMenuTrigger asChild>
                <span className="flex items-center gap-1.5 cursor-pointer hover:text-foreground">
                  {project.lead ? (
                    <>
                      <div className="h-5 w-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-[9px] font-medium">
                        {project.lead.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      <span className="text-xs">{project.lead}</span>
                    </>
                  ) : (
                    <>
                      <Users className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Add lead</span>
                    </>
                  )}
                </span>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-popover border-border">
                <DropdownMenuItem onClick={() => handleLeadChange('')}>No lead</DropdownMenuItem>
                {['John Doe', 'Jane Smith', 'jawadcoder0'].map((name) => (
                  <DropdownMenuItem key={name} onClick={() => handleLeadChange(name)}>
                    {name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Members */}
          <div className="text-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-muted-foreground">Members</span>
              <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setMemberDialogOpen(true)}>
                <Plus className="h-3 w-3" />
              </Button>
            </div>
            {project.members?.length > 0 ? (
              <div className="space-y-1">
                {project.members.map((member) => (
                  <div key={member} className="flex items-center gap-2 group">
                    <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center text-primary text-[9px] font-medium">
                      {member.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </div>
                    <span className="text-xs flex-1">{member}</span>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-4 w-4 opacity-0 group-hover:opacity-100"
                      onClick={() => handleRemoveMember(member)}
                    >
                      <X className="h-2.5 w-2.5" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <span className="text-xs text-muted-foreground">No members</span>
            )}
          </div>

          {/* Start date */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Start date</span>
            <Popover>
              <PopoverTrigger asChild>
                <span className="text-muted-foreground flex items-center gap-1.5 cursor-pointer hover:text-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  {project.startDate ? format(project.startDate, 'MMM d') : ''}
                </span>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-popover border-border" align="end">
                <CalendarComponent
                  mode="single"
                  selected={project.startDate}
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
                  <Calendar className="h-3.5 w-3.5" />
                  {project.targetDate ? format(project.targetDate, 'MMM d') : ''}
                </span>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-popover border-border" align="end">
                <CalendarComponent
                  mode="single"
                  selected={project.targetDate}
                  onSelect={(date) => handleDateChange('targetDate', date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <Separator className="bg-border" />

          {/* Milestones */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                Milestones
                <ChevronDown className="h-3 w-3" />
              </span>
              <Plus className="h-3.5 w-3.5 text-muted-foreground cursor-pointer hover:text-foreground" onClick={() => setMilestoneDialogOpen(true)} />
            </div>
            {project.milestones?.length > 0 ? (
              <div className="space-y-1">
                {project.milestones.map((milestone) => {
                  const milestoneIssues = projectIssues.filter(i => i.status !== 'cancelled');
                  const completed = milestoneIssues.filter(i => i.status === 'done').length;
                  return (
                    <div key={milestone.id} className="flex items-center gap-2 text-sm">
                      <Diamond className={cn('h-4 w-4', milestone.completed ? 'text-emerald-400' : 'text-yellow-400')} />
                      <span className="text-xs flex-1 truncate">{milestone.name}</span>
                      <span className="text-xs text-muted-foreground">{Math.round((completed / Math.max(milestoneIssues.length, 1)) * 100)}%</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground leading-relaxed">
                Add milestones to organize work within your project.
              </p>
            )}
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
                assigneeStats.length > 0 ? (
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
                )
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
              {project.updates?.slice(0, 2).map((update) => (
                <div key={update.id} className="flex items-start gap-2">
                  <MessageSquare className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <span>{update.author} posted an update · {format(update.createdAt, 'MMM d')}</span>
                </div>
              ))}
              <div className="flex items-start gap-2">
                <Layers className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span>{currentUser} created the project · {format(project.createdAt, 'MMM d')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Milestone Dialog */}
      <Dialog open={milestoneDialogOpen} onOpenChange={setMilestoneDialogOpen}>
        <DialogContent className="sm:max-w-[400px] bg-card border-border">
          <DialogHeader>
            <DialogTitle>Add milestone</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input 
                value={milestoneName} 
                onChange={(e) => setMilestoneName(e.target.value)} 
                placeholder="Milestone name..."
                className="bg-background/50"
              />
            </div>
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Textarea 
                value={milestoneDescription} 
                onChange={(e) => setMilestoneDescription(e.target.value)} 
                placeholder="Add description..."
                className="bg-background/50"
              />
            </div>
            <div className="space-y-2">
              <Label>Target date (optional)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <Calendar className="mr-2 h-4 w-4" />
                    {milestoneDate ? format(milestoneDate, 'PPP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-popover border-border">
                  <CalendarComponent mode="single" selected={milestoneDate} onSelect={setMilestoneDate} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setMilestoneDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleAddMilestone} disabled={!milestoneName.trim()}>Add milestone</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Resource Dialog */}
      <Dialog open={resourceDialogOpen} onOpenChange={setResourceDialogOpen}>
        <DialogContent className="sm:max-w-[400px] bg-card border-border">
          <DialogHeader>
            <DialogTitle>Add resource</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input 
                value={resourceName} 
                onChange={(e) => setResourceName(e.target.value)} 
                placeholder="Resource name..."
                className="bg-background/50"
              />
            </div>
            <div className="space-y-2">
              <Label>URL</Label>
              <Input 
                value={resourceUrl} 
                onChange={(e) => setResourceUrl(e.target.value)} 
                placeholder="https://..."
                className="bg-background/50"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setResourceDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleAddResource} disabled={!resourceName.trim() || !resourceUrl.trim()}>Add resource</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Member Dialog */}
      <Dialog open={memberDialogOpen} onOpenChange={setMemberDialogOpen}>
        <DialogContent className="sm:max-w-[400px] bg-card border-border">
          <DialogHeader>
            <DialogTitle>Add member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input 
                value={newMember} 
                onChange={(e) => setNewMember(e.target.value)} 
                placeholder="Member name..."
                className="bg-background/50"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setMemberDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleAddMember} disabled={!newMember.trim()}>Add member</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
