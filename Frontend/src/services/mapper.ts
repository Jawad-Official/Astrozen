import { Issue, IssuePriority, IssueStatus, TriageStatus, Project, ProjectStatus, ProjectHealth, ProjectPriority, ProjectUpdate, Comment as IssueComment, Activity as IssueActivity } from '@/types/issue';
import { Feature, FeatureType, FeatureStatus, FeatureHealth, FeatureMilestone } from '@/types/feature';

export const mapIssue = (data: any): Issue => ({
  id: data.id,
  identifier: data.identifier,
  title: data.title,
  description: data.description,
  issueType: (data.issue_type as string)?.toLowerCase() as IssueType,
  status: (data.status as string)?.toLowerCase() as IssueStatus,
  priority: (data.priority as string)?.toLowerCase() as IssuePriority,
  teamId: data.team_id, // Map team_id
  featureId: data.feature_id,
  milestoneId: data.milestone_id,
  cycleId: data.cycle_id,
  assignee: data.assignee_id,
  parentId: data.parent_id,
  assigneeName: data.assignee ? `${data.assignee.first_name} ${data.assignee.last_name}` : undefined,
  triageStatus: data.triage_status as TriageStatus,
  estimate: data.estimate,
  dueDate: data.due_date ? new Date(data.due_date) : undefined,
  createdAt: new Date(data.created_at),
  updatedAt: new Date(data.updated_at),
});

// mapLabel removed

export const mapFeature = (data: any): Feature => ({
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
  status: (data.status as string)?.toLowerCase() as FeatureStatus,
  priority: (data.priority as string)?.toLowerCase() as IssuePriority,
  validationEvidence: data.validation_evidence,
  health: (data.health as string)?.toLowerCase() as FeatureHealth,
  deliveryConfidence: data.delivery_confidence,
  milestones: (data.milestones || [])
    .filter((m: any) => !m.parent_id)
    .map(mapFeatureMilestone),
  createdAt: data.created_at,
});

export const mapFeatureMilestone = (data: any): FeatureMilestone => ({
  id: data.id,
  featureId: data.feature_id,
  parentId: data.parent_id,
  name: data.name,
  description: data.description,
  targetDate: data.target_date,
  completed: data.completed,
  subMilestones: [],
});

export const mapProject = (data: any): Project => {
  // console.log('Mapping project members:', data.members);
  const members = (data.members || []).map((m: any) => {
    if (typeof m === 'string') return m;
    return m.id || m.user_id;
  }).filter(Boolean);

  const teams = (data.teams || []).map((t: any) => {
    if (typeof t === 'string') return t;
    return t.id;
  }).filter(Boolean);

  return {
    id: data.id,
    name: data.name,
    icon: data.icon,
    color: data.color,
    description: data.description,
    status: (data.status as string)?.toLowerCase() as ProjectStatus,
    health: (data.health as string)?.toLowerCase() as ProjectHealth,
    priority: (data.priority as string)?.toLowerCase() as ProjectPriority,
    teamId: data.team_id,
    lead: data.lead_id, 
    leadName: data.lead ? `${data.lead.first_name} ${data.lead.last_name}` : undefined, 
    members, 
    teams, 
    targetDate: data.target_date ? new Date(data.target_date) : undefined,
    startDate: data.start_date ? new Date(data.start_date) : undefined,
    milestones: [], 
    updates: (data.updates || []).map(mapProjectUpdate), 
    resources: (data.resources || []).map((r: any) => ({
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

export const mapProjectUpdate = (data: any): ProjectUpdate => ({
  id: data.id,
  projectId: data.project_id,
  health: (data.health as string)?.toLowerCase() as ProjectHealth,
  content: data.content,
  author: data.author_id,
  authorName: data.author ? `${data.author.first_name} ${data.author.last_name}` : undefined,
  createdAt: new Date(data.created_at),
  comments: (data.comments || []).map((c: any) => ({
    id: c.id,
    content: c.content,
    author: c.author_id,
    authorName: c.author ? `${c.author.first_name} ${c.author.last_name}` : undefined,
    parentId: c.parent_id,
    createdAt: new Date(c.created_at),
    reactions: Object.entries(
      (c.reactions || []).reduce((acc: any, r: any) => {
        if (!acc[r.emoji]) acc[r.emoji] = [];
        acc[r.emoji].push(r.user_id);
        return acc;
      }, {})
    ).map(([emoji, users]) => ({ emoji, users: users as string[] })),
  })),
  reactions: Object.entries(
    (data.reactions || []).reduce((acc: any, r: any) => {
      if (!acc[r.emoji]) acc[r.emoji] = [];
      acc[r.emoji].push(r.user_id);
      return acc;
    }, {})
  ).map(([emoji, users]) => ({ emoji, users: users as string[] })),
});

export const mapComment = (data: any): IssueComment => ({
  id: data.id,
  issueId: data.issue_id,
  author: data.author_id,
  authorName: data.author ? `${data.author.first_name} ${data.author.last_name}` : undefined,
  content: data.content,
  createdAt: new Date(data.created_at),
});

export const mapActivity = (data: any): IssueActivity => ({
  id: data.id,
  issueId: data.issue_id,
  type: data.type as any,
  actor: data.actor_id,
  actorName: data.actor ? `${data.actor.first_name} ${data.actor.last_name}` : undefined,
  oldValue: data.old_value,
  newValue: data.new_value,
  createdAt: new Date(data.created_at),
});

export const mapMilestone = (data: any) => ({
  id: data.id,
  name: data.name,
  description: data.description,
  targetDate: data.target_date ? new Date(data.target_date) : undefined,
  completed: data.completed,
});
