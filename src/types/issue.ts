export type IssueStatus = 'backlog' | 'todo' | 'in_progress' | 'done' | 'cancelled';

export type IssuePriority = 'urgent' | 'high' | 'medium' | 'low' | 'none';

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
