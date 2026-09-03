import {
  Link,
  Plus,
  Users,
  CalendarBlank,
  NotePencil,
  Check,
  X,
  ArrowSquareOut,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ProjectBar } from '@/components/ProjectBar';
import { FeatureWindow } from '@/components/FeatureWindow';
import { PROJECT_STATUS_OPTIONS } from '@/lib/project-options';
import { PROJECT_PRIORITY_OPTIONS } from '@/lib/constants';
import { Project, ProjectStatus, ProjectPriority, ProjectUpdate as ProjectUpdateType } from '@/types/issue';
import { Feature, FeatureMilestone } from '@/types/feature';
import { Team, User } from '@/types/auth';
import { OrgMember } from '@/services/users';

export const ProjectOverviewTab = ({
  project,
  currentStatus,
  currentPriority,
  leadName,
  orgMembers,
  teams,
  canManageProject,
  editingDescription,
  setEditingDescription,
  descriptionDraft,
  setDescriptionDraft,
  handleSaveDescription,
  handleStatusChange,
  handlePriorityChange,
  handleLeadChange,
  handleToggleTeam,
  handleDateChange,
  handleDeleteResource,
  setResourceDialogOpen,
  sortedUpdates,
  setActiveTab,
  user,
  currentUser,
  handleDeleteUpdate,
  handleUpdateUpdate,
  handleAddUpdateComment,
  handleDeleteUpdateComment,
  toggleUpdateReaction,
  toggleUpdateCommentReaction,
  projectFeatures,
  projects,
  updateFeature,
  deleteFeature,
  setSelectedFeatureId,
  setCreateFeatureOpen,
  setActiveFeatureId,
  setNewFeatureMilestoneParent,
  setCreateFeatureMilestoneOpen,
  setSelectedMilestoneId,
  setCreateIssueOpen,
  toggleFeatureMilestone,
  updateFeatureMilestone,
  deleteFeatureMilestone,
}: {
  project: Project;
  currentStatus: (typeof PROJECT_STATUS_OPTIONS)[number];
  currentPriority: (typeof PROJECT_PRIORITY_OPTIONS)[number];
  leadName: string | null;
  orgMembers: OrgMember[];
  teams: Team[];
  canManageProject: boolean;
  editingDescription: boolean;
  setEditingDescription: (value: boolean) => void;
  descriptionDraft: string;
  setDescriptionDraft: (value: string) => void;
  handleSaveDescription: () => Promise<void>;
  handleStatusChange: (status: ProjectStatus) => Promise<void>;
  handlePriorityChange: (priority: ProjectPriority) => Promise<void>;
  handleLeadChange: (lead: string) => Promise<void>;
  handleToggleTeam: (teamId: string) => Promise<void>;
  handleDateChange: (field: 'startDate' | 'targetDate', date: Date | undefined) => Promise<void>;
  handleDeleteResource: (resourceId: string) => Promise<void>;
  setResourceDialogOpen: (value: boolean) => void;
  sortedUpdates: ProjectUpdateType[];
  setActiveTab: (tab: string) => void;
  user: User | null;
  currentUser: string | null;
  handleDeleteUpdate: (updateId: string) => Promise<void>;
  handleUpdateUpdate: (updateId: string, updates: Partial<ProjectUpdateType>) => Promise<void>;
  handleAddUpdateComment: (updateId: string, content: string, parentId?: string) => Promise<void>;
  handleDeleteUpdateComment: (updateId: string, commentId: string) => Promise<void>;
  toggleUpdateReaction: (projectId: string, updateId: string, emoji: string) => Promise<void>;
  toggleUpdateCommentReaction: (projectId: string, updateId: string, commentId: string, emoji: string) => Promise<void>;
  projectFeatures: Feature[];
  projects: Project[];
  updateFeature: (id: string, updates: Partial<Feature>) => Promise<void>;
  deleteFeature: (id: string) => Promise<void>;
  setSelectedFeatureId: (id: string | null) => void;
  setCreateFeatureOpen: (value: boolean) => void;
  setActiveFeatureId: (id: string | null) => void;
  setNewFeatureMilestoneParent: (id: string | undefined) => void;
  setCreateFeatureMilestoneOpen: (value: boolean) => void;
  setSelectedMilestoneId: (id: string | undefined) => void;
  setCreateIssueOpen: (value: boolean) => void;
  toggleFeatureMilestone: (featureId: string, milestoneId: string) => Promise<void>;
  updateFeatureMilestone: (featureId: string, milestoneId: string, updates: Partial<FeatureMilestone>) => Promise<void>;
  deleteFeatureMilestone: (featureId: string, milestoneId: string) => Promise<void>;
}) => {
  return (
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
          <DropdownMenuTrigger asChild>
            <span className="text-muted-foreground flex items-center gap-1.5 cursor-pointer hover:text-foreground">
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
            onToggleReaction={(emoji) => toggleUpdateReaction(project.id, sortedUpdates[0].id, emoji)}
            onToggleCommentReaction={(commentId, emoji) => toggleUpdateCommentReaction(project.id, sortedUpdates[0].id, commentId, emoji)}
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
        <div className="bg-muted/20 rounded-xl border border-border overflow-hidden shadow-sm">
          <FeatureWindow.List
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
            onCreateIssueForMilestone={(_featureId, milestoneId) => {
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
  );
};
