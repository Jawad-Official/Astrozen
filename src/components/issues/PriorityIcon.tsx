import { cn } from '@/lib/utils';
import { IssuePriority } from '@/types/issue';

interface PriorityIconProps {
  priority: IssuePriority;
  className?: string;
}

const priorityStyles: Record<IssuePriority, string> = {
  urgent: 'text-[hsl(var(--priority-urgent))]',
  high: 'text-[hsl(var(--priority-high))]',
  medium: 'text-[hsl(var(--priority-medium))]',
  low: 'text-[hsl(var(--priority-low))]',
  none: 'text-[hsl(var(--priority-none))]',
};

export function PriorityIcon({ priority, className }: PriorityIconProps) {
  const bars = priority === 'urgent' ? 4 : priority === 'high' ? 3 : priority === 'medium' ? 2 : priority === 'low' ? 1 : 0;
  
  return (
    <div className={cn('flex items-end gap-0.5 h-4 w-4', className)}>
      {[1, 2, 3, 4].map((level) => (
        <div
          key={level}
          className={cn(
            'w-[3px] transition-colors',
            level <= bars ? priorityStyles[priority] : 'bg-muted',
            level === 1 && 'h-1',
            level === 2 && 'h-2',
            level === 3 && 'h-3',
            level === 4 && 'h-4',
            level <= bars && 'bg-current'
          )}
        />
      ))}
    </div>
  );
}
