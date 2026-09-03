import { Issue, IssuePriority, IssueStatus, IssueType, TriageStatus, Project, ProjectStatus, ProjectHealth, ProjectPriority, ProjectUpdate, Comment as IssueComment, Activity as IssueActivity } from '@/types/issue';
import { Feature, FeatureType, FeatureStatus, FeatureHealth, FeatureMilestone } from '@/types/feature';

/** Shape of a user reference embedded in API responses (assignee/author/lead). */
interface RawUserRef {
  id?: string;
  first_name?: string;
  last_name?: string;
}

/** Full user record as embedded in team/organization member lists. */
export interface RawUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  job_title?: string;
  organization_id?: string;
  is_active: boolean;
  role: string;
  created_at: string;
  updated_at: string;
}

interface RawReaction {
  emoji: string;
  user_id: string;
}

interface RawComment {
  id: string;
  content: string;
  author_id: string;
  author?: RawUserRef;
  parent_id?: string;
  created_at: string;
  reactions?: RawReaction[];
}

export interface RawIssueComment {
  id: string;
  issue_id: string;
  content: string;
  author_id: string;
  author?: RawUserRef;
  created_at: string;
}

export interface RawIssue {
  id: string;
  identifier: string;
  title: string;
  description?: string;
  issue_type?: string;
  status?: string;
  priority?: string;
  team_id: string;
  feature_id: string;
  milestone_id?: string;
  assignee_id?: string;
  parent_id?: string;
  assignee?: RawUserRef;
  triage_status?: string;
  due_date?: string;
  created_at: string;
  updated_at: string;
}

export interface RawFeatureMilestone {
  id: string;
  feature_id: string;
  parent_id?: string;
  name: string;
  description?: string;
  target_date?: string;
  completed: boolean;
}

export interface RawFeature {
  id: string;
  identifier: string;
  project_id: string;
  parent_id?: string;
  name: string;
  problem_statement?: string;
  target_user?: string;
  expected_outcome?: string;
  success_metric?: string;
  type?: string;
  status?: string;
  priority?: string;
  validation_evidence?: string;
  health?: string;
  delivery_confidence?: number;
  milestones?: RawFeatureMilestone[];
  created_at: string;
  updated_at: string;
}

interface RawProjectMember {
  id?: string;
  user_id?: string;
}

interface RawProjectTeam {
  id?: string;
}

interface RawProjectResource {
  id: string;
  name: string;
  url: string;
  type: 'link' | 'document';
}

export interface RawProject {
  id: string;
  name: string;
  icon: string;
  color: string;
  description?: string;
  status?: string;
  health?: string;
  priority?: string;
  team_id?: string;
  lead_id?: string;
  lead?: RawUserRef;
  members?: (string | RawProjectMember)[];
  teams?: (string | RawProjectTeam)[];
  target_date?: string;
  start_date?: string;
  updates?: RawProjectUpdate[];
  resources?: RawProjectResource[];
  created_at: string;
  updated_at: string;
  is_favorite?: boolean;
}

export interface RawProjectUpdate {
  id: string;
  project_id: string;
  health?: string;
  content: string;
  author_id: string;
  author?: RawUserRef;
  created_at: string;
  comments?: RawComment[];
  reactions?: RawReaction[];
}

export interface RawActivity {
  id: string;
  issue_id: string;
  type: string;
  actor_id: string;
  actor?: RawUserRef;
  old_value?: string;
  new_value?: string;
  created_at: string;
}

export interface RawMilestone {
  id: string;
  name: string;
  description?: string;
  target_date?: string;
  completed: boolean;
}

const mapReactions = (reactions: RawReaction[] | undefined) =>
  Object.entries(
    (reactions || []).reduce((acc: Record<string, string[]>, r) => {
      if (!acc[r.emoji]) acc[r.emoji] = [];
      acc[r.emoji].push(r.user_id);
      return acc;
    }, {})
  ).map(([emoji, users]) => ({ emoji, users }));

export const mapIssue = (data: RawIssue): Issue => ({
  id: data.id,
  identifier: data.identifier,
  title: data.title,
  description: data.description,
  issueType: data.issue_type?.toLowerCase() as IssueType,
  status: data.status?.toLowerCase() as IssueStatus,
  priority: data.priority?.toLowerCase() as IssuePriority,
  teamId: data.team_id,
  featureId: data.feature_id,
  milestoneId: data.milestone_id,
  assignee: data.assignee_id,
  parentId: data.parent_id,
  assigneeName: data.assignee ? `${data.assignee.first_name} ${data.assignee.last_name}` : undefined,
  triageStatus: data.triage_status as TriageStatus,
  dueDate: data.due_date ? new Date(data.due_date) : undefined,
  createdAt: new Date(data.created_at),
  updatedAt: new Date(data.updated_at),
});

export const mapFeature = (data: RawFeature): Feature => ({
  id: data.id,
  identifier: data.identifier,
  projectId: data.project_id,
  parentId: data.parent_id,
  name: data.name,
  problemStatement: data.problem_statement,
  targetUser: data.target_user,
  expectedOutcome: data.expected_outcome,
  successMetric: data.success_metric,
  type: data.type as FeatureType,
  status: data.status?.toLowerCase() as FeatureStatus,
  priority: data.priority?.toLowerCase() as IssuePriority,
  validationEvidence: data.validation_evidence,
  health: data.health?.toLowerCase() as FeatureHealth,
  deliveryConfidence: data.delivery_confidence,
  milestones: (data.milestones || [])
    .filter((m) => !m.parent_id)
    .map(mapFeatureMilestone),
  createdAt: data.created_at,
  updatedAt: data.updated_at,
});

export const mapFeatureMilestone = (data: RawFeatureMilestone): FeatureMilestone => ({
  id: data.id,
  featureId: data.feature_id,
  parentId: data.parent_id,
  name: data.name,
  description: data.description,
  targetDate: data.target_date,
  completed: data.completed,
});

export const mapProject = (data: RawProject): Project => {
  const members = (data.members || []).map((m) => {
    if (typeof m === 'string') return m;
    return m.id || m.user_id;
  }).filter((id): id is string => Boolean(id));

  const teams = (data.teams || []).map((t) => {
    if (typeof t === 'string') return t;
    return t.id;
  }).filter((id): id is string => Boolean(id));

  return {
    id: data.id,
    name: data.name,
    icon: data.icon,
    color: data.color,
    description: data.description,
    status: data.status?.toLowerCase() as ProjectStatus,
    health: data.health?.toLowerCase() as ProjectHealth,
    priority: data.priority?.toLowerCase() as ProjectPriority,
    teamId: data.team_id,
    lead: data.lead_id,
    leadName: data.lead ? `${data.lead.first_name} ${data.lead.last_name}` : undefined,
    members,
    teams,
    targetDate: data.target_date ? new Date(data.target_date) : undefined,
    startDate: data.start_date ? new Date(data.start_date) : undefined,
    milestones: [],
    updates: (data.updates || []).map(mapProjectUpdate),
    resources: (data.resources || []).map((r) => ({
      id: r.id,
      name: r.name,
      url: r.url,
      type: r.type,
    })),
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
    isFavorite: data.is_favorite,
  };
};

export const mapProjectUpdate = (data: RawProjectUpdate): ProjectUpdate => ({
  id: data.id,
  projectId: data.project_id,
  health: data.health?.toLowerCase() as ProjectHealth,
  content: data.content,
  author: data.author_id,
  authorName: data.author ? `${data.author.first_name} ${data.author.last_name}` : undefined,
  createdAt: new Date(data.created_at),
  comments: (data.comments || []).map((c) => ({
    id: c.id,
    content: c.content,
    author: c.author_id,
    authorName: c.author ? `${c.author.first_name} ${c.author.last_name}` : undefined,
    parentId: c.parent_id,
    createdAt: new Date(c.created_at),
    reactions: mapReactions(c.reactions),
  })),
  reactions: mapReactions(data.reactions),
});

export const mapComment = (data: RawIssueComment): IssueComment => ({
  id: data.id,
  issueId: data.issue_id,
  author: data.author_id,
  authorName: data.author ? `${data.author.first_name} ${data.author.last_name}` : undefined,
  content: data.content,
  createdAt: new Date(data.created_at),
});

export const mapActivity = (data: RawActivity): IssueActivity => ({
  id: data.id,
  issueId: data.issue_id,
  type: data.type as IssueActivity['type'],
  actor: data.actor_id,
  actorName: data.actor ? `${data.actor.first_name} ${data.actor.last_name}` : undefined,
  oldValue: data.old_value,
  newValue: data.new_value,
  createdAt: new Date(data.created_at),
});

export const mapMilestone = (data: RawMilestone) => ({
  id: data.id,
  name: data.name,
  description: data.description,
  targetDate: data.target_date ? new Date(data.target_date) : undefined,
  completed: data.completed,
});

export const mapUser = (data: RawUser) => ({
  id: data.id,
  email: data.email,
  firstName: data.first_name,
  lastName: data.last_name,
  fullName: `${data.first_name} ${data.last_name}`,
  jobTitle: data.job_title,
  organizationId: data.organization_id,
  isActive: data.is_active,
  role: data.role,
  createdAt: data.created_at,
  updatedAt: data.updated_at,
});
