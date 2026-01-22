export type IssueStatus = 'backlog' | 'todo' | 'in_progress' | 'done' | 'cancelled';

export type IssuePriority = 'urgent' | 'high' | 'medium' | 'low' | 'none';

export type TriageStatus = 'pending' | 'accepted' | 'declined' | 'duplicate';

export interface Label {
  id: string;
  name: string;
  color: 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple' | 'pink';
}

export interface Project {
  id: string;
  name: string;
  icon: string;
  color: string;
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
  content: string;
  createdAt: Date;
}

export interface Activity {
  id: string;
  issueId: string;
  type: 'created' | 'status_changed' | 'priority_changed' | 'assigned' | 'comment' | 'cycle_changed';
  actor: string;
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
  labels: string[];
  projects: string[];
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
  status: IssueStatus;
  priority: IssuePriority;
  labels: Label[];
  projectId?: string;
  cycleId?: string;
  assignee?: string;
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

export const PRIORITY_CONFIG: Record<IssuePriority, { label: string; order: number }> = {
  urgent: { label: 'Urgent', order: 0 },
  high: { label: 'High', order: 1 },
  medium: { label: 'Medium', order: 2 },
  low: { label: 'Low', order: 3 },
  none: { label: 'No priority', order: 4 },
};

export const ESTIMATE_OPTIONS = [
  { value: 0, label: 'No estimate' },
  { value: 1, label: '1 point' },
  { value: 2, label: '2 points' },
  { value: 3, label: '3 points' },
  { value: 5, label: '5 points' },
  { value: 8, label: '8 points' },
];