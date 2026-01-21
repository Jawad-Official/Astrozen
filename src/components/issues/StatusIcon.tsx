import { Circle, CircleDot, CheckCircle2, XCircle, CircleDashed } from 'lucide-react';
import { IssueStatus } from '@/types/issue';
import { cn } from '@/lib/utils';

interface StatusIconProps {
  status: IssueStatus;
  className?: string;
}

const statusStyles: Record<IssueStatus, string> = {
  backlog: 'text-[hsl(var(--status-backlog))]',
  todo: 'text-[hsl(var(--status-todo))]',
  in_progress: 'text-[hsl(var(--status-in-progress))]',
  done: 'text-[hsl(var(--status-done))]',
  cancelled: 'text-[hsl(var(--status-cancelled))]',
};

export function StatusIcon({ status, className }: StatusIconProps) {
  const iconClass = cn('h-4 w-4', statusStyles[status], className);

  switch (status) {
    case 'backlog':
      return <CircleDashed className={iconClass} />;
    case 'todo':
      return <Circle className={iconClass} />;
    case 'in_progress':
      return <CircleDot className={iconClass} />;
    case 'done':
      return <CheckCircle2 className={iconClass} />;
    case 'cancelled':
      return <XCircle className={iconClass} />;
    default:
      return <Circle className={iconClass} />;
  }
}
