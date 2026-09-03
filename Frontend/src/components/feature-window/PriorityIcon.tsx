import { cn } from '@/lib/utils';
import { IssuePriority, PRIORITY_CONFIG } from '@/types/issue';

export const PriorityIcon = ({ priority, className }: { priority: string; className?: string }) => {
  const bars = priority === 'urgent' ? 4 : priority === 'high' ? 3 : priority === 'medium' ? 2 : priority === 'low' ? 1 : 0;
  const config = PRIORITY_CONFIG[priority as IssuePriority];
  return (
    <div className={cn('flex items-end gap-0.5 h-4 w-4', config?.color, className)}>
      {[1, 2, 3, 4].map((level) => (
        <div key={level} className={cn('w-[3px] transition-colors rounded-full', level <= bars ? 'bg-current' : 'bg-muted-foreground/20', level === 1 && 'h-1', level === 2 && 'h-2', level === 3 && 'h-3', level === 4 && 'h-4')} />
      ))}
    </div>
  );
};
