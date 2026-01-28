import { ProjectStatus, ProjectHealth, ProjectPriority, Label } from '@/types/issue';

// Project Status Config (without JSX)
export const PROJECT_STATUS_CONFIG: Record<ProjectStatus, { label: string }> = {
  backlog: { label: 'Backlog' },
  planned: { label: 'Planned' },
  in_progress: { label: 'In Progress' },
  paused: { label: 'Paused' },
  completed: { label: 'Completed' },
  cancelled: { label: 'Cancelled' },
};

// Project Priority Options
export const PROJECT_PRIORITY_OPTIONS: { value: ProjectPriority; label: string; color: string; order: number }[] = [
  { value: 'urgent', label: 'Urgent', color: 'text-red-400', order: 0 },
  { value: 'high', label: 'High', color: 'text-orange-400', order: 1 },
  { value: 'medium', label: 'Medium', color: 'text-yellow-400', order: 2 },
  { value: 'low', label: 'Low', color: 'text-blue-400', order: 3 },
  { value: 'none', label: 'No priority', color: 'text-muted-foreground', order: 4 },
];

// Project Health Config
export const PROJECT_HEALTH_CONFIG: Record<ProjectHealth, { label: string; className: string }> = {
  on_track: { label: 'On track', className: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  at_risk: { label: 'At risk', className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  off_track: { label: 'Off track', className: 'bg-red-500/20 text-red-400 border-red-500/30' },
  no_updates: { label: 'No updates', className: 'bg-muted text-muted-foreground border-border' },
};

// Label Colors
export const LABEL_COLOR_OPTIONS: Label['color'][] = ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink'];

export const LABEL_COLORS: Record<string, string> = {
  red: 'bg-[hsl(var(--label-red))]',
  orange: 'bg-[hsl(var(--label-orange))]',
  yellow: 'bg-[hsl(var(--label-yellow))]',
  green: 'bg-[hsl(var(--label-green))]',
  blue: 'bg-[hsl(var(--label-blue))]',
  purple: 'bg-[hsl(var(--label-purple))]',
  pink: 'bg-[hsl(var(--label-pink))]',
};

// Project Icons
export const PROJECT_ICONS = ['📁', '🎨', '⚡', '📱', '🚀', '🔧', '💡', '🎯', '📊', '🔒'];
