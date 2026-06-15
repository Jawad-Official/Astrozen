import { ProjectStatus, ProjectPriority, ProjectHealth } from '@/types/issue';
import { 
  Circle, 
  CircleHalf, 
  Check, 
  X, 
  WarningCircle 
} from '@phosphor-icons/react';

// Project Status Options with Icons (for UI dropdowns)
export const PROJECT_STATUS_OPTIONS: { value: ProjectStatus; label: string; icon: React.ReactNode }[] = [
  { value: 'backlog', label: 'Backlog', icon: <Circle className="h-3 w-3 text-purple-400" /> },
  { value: 'planned', label: 'Planned', icon: <Circle className="h-3 w-3 text-blue-400" /> },
  { value: 'in_progress', label: 'In Progress', icon: <CircleHalf className="h-3 w-3 text-cyan-400" /> },
  { value: 'paused', label: 'Paused', icon: <Circle className="h-3 w-3 text-orange-400" /> },
  { value: 'completed', label: 'Completed', icon: <Check className="h-3 w-3 text-emerald-400" /> },
  { value: 'cancelled', label: 'Cancelled', icon: <X className="h-3 w-3 text-red-400" /> },
];

// Project Health Options with Icons (for UI dropdowns)
export const PROJECT_HEALTH_OPTIONS: { value: ProjectHealth; label: string; icon: React.ReactNode; className: string }[] = [
  { value: 'on_track', label: 'On track', icon: <Check className="h-3 w-3" />, className: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  { value: 'at_risk', label: 'At risk', icon: <WarningCircle className="h-3 w-3" />, className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  { value: 'off_track', label: 'Off track', icon: <WarningCircle className="h-3 w-3" />, className: 'bg-red-500/20 text-red-400 border-red-500/30' },
  { value: 'no_updates', label: 'No updates', icon: <Circle className="h-3 w-3" />, className: 'bg-muted text-muted-foreground border-border' },
];
