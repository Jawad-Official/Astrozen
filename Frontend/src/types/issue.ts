export type IssueStatus = 'backlog' | 'todo' | 'in_progress' | 'done' | 'cancelled';

export type IssuePriority = 'urgent' | 'high' | 'medium' | 'low' | 'none';

export type IssueType = 'bug' | 'task' | 'refactor' | 'chore' | 'technical_debt' | 'investigation';

export type TriageStatus = 'pending' | 'accepted' | 'declined' | 'duplicate';

export interface Label {
  id: string;
  name: string;
  color: 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple' | 'pink';
}

export type ProjectStatus = 'backlog' | 'planned' | 'in_progress' | 'paused' | 'completed' | 'cancelled';
export type ProjectHealth = 'on_track' | 'at_risk' | 'off_track' | 'no_updates';
export type ProjectPriority = 'urgent' | 'high' | 'medium' | 'low' | 'none';

export interface Milestone {
  id: string;
  name: string;
  description?: string;
  targetDate?: Date;
  completed: boolean;
}

export interface UpdateAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
}

export interface UpdateComment {
  id: string;
  content: string;
  author: string;
  authorName?: string;
  createdAt: Date;
  parentId?: string; // For nested replies
  attachments?: UpdateAttachment[];
  reactions?: EmojiReaction[];
}

export interface EmojiReaction {
  emoji: string;
  users: string[];
}

export interface ProjectUpdate {
  id: string;
  projectId: string;
  health: ProjectHealth;
  content: string;
  author: string;
  authorName?: string;
  createdAt: Date;
  attachments?: UpdateAttachment[];
  comments?: UpdateComment[];
  reactions?: EmojiReaction[];
}

export interface ProjectResource {
  id: string;
  name: string;
  url: string;
  type: 'link' | 'document';
}

export interface IssueResource {
  id: string;
  name: string;
  url: string;
  type: 'link' | 'document';
}

export interface Project {
  id: string;
  name: string;
  icon: string;
  color: string;
  description?: string;
  status: ProjectStatus;
  health: ProjectHealth;
  priority: ProjectPriority;
  teamId?: string; // Added teamId
  lead?: string;
  leadName?: string;
  members: string[];
  teams: string[];
  targetDate?: Date;
  startDate?: Date;
  milestones: Milestone[];
  updates: ProjectUpdate[];
  resources: ProjectResource[];
  createdAt: Date;
  updatedAt: Date;
  isFavorite?: boolean; // Added isFavorite
}

export interface CustomView {
  id: string;
  name: string;
  icon: string;
  type: 'issues' | 'projects';
  owner: string;
  visibility: 'personal' | 'team';
  filters: FilterState;
  layout: 'list' | 'board';
  createdAt: Date;
}

export interface Cycle {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  status: 'upcoming' | 'active' | 'completed';
}

export interface Comment {
  id: string;
  issueId: string;
  author: string;
  authorName?: string;
  content: string;
  createdAt: Date;
}

export interface Activity {
  id: string;
  issueId: string;
  type: 'created' | 'status_changed' | 'priority_changed' | 'type_changed' | 'assigned' | 'comment' | 'cycle_changed';
  actor: string;
  actorName?: string;
  oldValue?: string;
  newValue?: string;
  createdAt: Date;
}

export interface SavedFilter {
  id: string;
  name: string;
  filters: FilterState;
}

export interface FilterState {
  statuses: IssueStatus[];
  priorities: IssuePriority[];
  types: IssueType[];
  projects: string[];
  labels: string[];
  cycles: string[];
  assignees: string[];
  hasNoCycle: boolean;
  hasNoAssignee: boolean;
}

export interface Issue {
  id: string;
  identifier: string;
  title: string;
  description?: string;
  issueType: IssueType; // Added issueType
  status: IssueStatus;
  priority: IssuePriority;
  teamId: string; // Added teamId
  featureId: string;
  milestoneId?: string;
  cycleId?: string;
  assignee?: string;
  assigneeName?: string;
  parentId?: string;
  labels?: Label[];
  subIssues?: Issue[];
  resources?: IssueResource[];
  triageStatus?: TriageStatus;
  estimate?: number;
  dueDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export const STATUS_CONFIG: Record<IssueStatus, { label: string; icon: string }> = {
  backlog: { label: 'Backlog', icon: 'circle-dashed' },
  todo: { label: 'Todo', icon: 'circle' },
  in_progress: { label: 'In Progress', icon: 'circle-dot' },
  done: { label: 'Done', icon: 'check-circle-2' },
  cancelled: { label: 'Cancelled', icon: 'x-circle' },
};

export const PRIORITY_CONFIG: Record<IssuePriority, { label: string; order: number; color: string }> = {
  urgent: { label: 'Urgent', order: 0, color: 'text-red-400' },
  high: { label: 'High', order: 1, color: 'text-orange-400' },
  medium: { label: 'Medium', order: 2, color: 'text-yellow-400' },
  low: { label: 'Low', order: 3, color: 'text-blue-400' },
  none: { label: 'No priority', order: 4, color: 'text-zinc-500' },
};

export const TYPE_CONFIG: Record<IssueType, { label: string; icon: string }> = {
  bug: { label: 'Bug', icon: 'bug' },
  task: { label: 'Task', icon: 'check-square' },
  refactor: { label: 'Refactor', icon: 'wrench' },
  chore: { label: 'Chore', icon: 'broom' },
  technical_debt: { label: 'Technical Debt', icon: 'shield-warning' },
  investigation: { label: 'Investigation', icon: 'magnifying-glass' },
};

export const ESTIMATE_OPTIONS = [
  { value: 0, label: 'No estimate' },
  { value: 1, label: '1 point' },
  { value: 2, label: '2 points' },
  { value: 3, label: '3 points' },
  { value: 5, label: '5 points' },
  { value: 8, label: '8 points' },
];