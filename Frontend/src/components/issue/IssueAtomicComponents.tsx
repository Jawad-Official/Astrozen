import * as React from "react";
import { cn } from "@/lib/utils";
import { 
  IssueStatus, 
  IssueType, 
  IssuePriority, 
  STATUS_CONFIG, 
  PRIORITY_CONFIG 
} from "@/types/issue";
import { 
  Bug, 
  CheckSquareOffset, 
  ArrowsClockwise, 
  MagicWand, 
  Warning, 
  Binoculars, 
  Circle, 
  CircleHalf, 
  CheckCircle, 
  XCircle, 
  CircleDashed 
} from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";

export const getStatusColorClass = (status: IssueStatus) => {
  switch (status) {
    case 'backlog': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
    case 'todo': return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
    case 'in_progress': return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
    case 'done': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    case 'cancelled': return 'bg-red-500/10 text-red-400 border-red-500/20';
    default: return 'bg-primary/10 text-primary border-primary/20';
  }
};

export const IssueStatusIcon = ({ status, className }: { status: IssueStatus; className?: string }) => {
  const iconClass = cn('h-4 w-4', className);
  switch (status) {
    case 'backlog': return <CircleDashed className={cn(iconClass, 'text-purple-400')} />;
    case 'todo': return <Circle className={cn(iconClass, 'text-zinc-400')} />;
    case 'in_progress': return <CircleHalf className={cn(iconClass, 'text-cyan-400')} />;
    case 'done': return <CheckCircle weight="fill" className={cn(iconClass, 'text-emerald-400')} />;
    case 'cancelled': return <XCircle className={cn(iconClass, 'text-red-400')} />;
    default: return <Circle className={iconClass} />;
  }
};

export const IssueTypeIcon = ({ type, className }: { type: IssueType; className?: string }) => {
  const iconClass = cn('h-4 w-4', className);
  switch (type) {
    case 'bug': return <Bug weight="fill" className={cn(iconClass, 'text-rose-500')} />;
    case 'task': return <CheckSquareOffset weight="bold" className={cn(iconClass, 'text-blue-500')} />;
    case 'refactor': return <ArrowsClockwise weight="bold" className={cn(iconClass, 'text-indigo-500')} />;
    case 'chore': return <MagicWand weight="bold" className={cn(iconClass, 'text-amber-500')} />;
    case 'technical_debt': return <Warning weight="fill" className={cn(iconClass, 'text-orange-500')} />;
    case 'investigation': return <Binoculars weight="bold" className={cn(iconClass, 'text-cyan-500')} />;
    default: return <CheckSquareOffset className={iconClass} />;
  }
};

export const IssuePriorityIcon = ({ priority, className }: { priority: string; className?: string }) => {
  const config = PRIORITY_CONFIG[priority as IssuePriority];
  const level = priority === 'urgent' ? 4 : priority === 'high' ? 3 : priority === 'medium' ? 2 : priority === 'low' ? 1 : 0;
  const colorClass = config?.color;

  return (
    <svg 
      viewBox="0 0 16 16" 
      className={cn("h-4 w-4", colorClass, className)}
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="1" y="11" width="2" height="4" rx="1" className={cn(level >= 1 ? "opacity-100" : "opacity-20")} />
      <rect x="5" y="8" width="2" height="7" rx="1" className={cn(level >= 2 ? "opacity-100" : "opacity-20")} />
      <rect x="9" y="5" width="2" height="10" rx="1" className={cn(level >= 3 ? "opacity-100" : "opacity-20")} />
      <rect x="13" y="2" width="2" height="13" rx="1" className={cn(level >= 4 ? "opacity-100" : "opacity-20")} />
    </svg>
  );
};

export const IssueStatusBadge = ({ status, className, children }: { status: IssueStatus; className?: string; children?: React.ReactNode }) => {
  return (
    <Badge variant="outline" className={cn(
      "h-5 px-1.5 text-[9px] font-bold uppercase tracking-wider transition-colors hover:bg-white/5 whitespace-nowrap",
      getStatusColorClass(status),
      className
    )}>
      {children || STATUS_CONFIG[status].label}
    </Badge>
  );
};

export const IssueIdentifier = ({ identifier, className }: { identifier: string; className?: string }) => {
  return (
    <span className={cn("text-[10px] text-white/90 font-mono transition-colors truncate", className)}>
      {identifier}
    </span>
  );
};
