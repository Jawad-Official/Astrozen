import { cn } from '@/lib/utils';
import { FeatureStatus } from '@/types/feature';
import { Binoculars, CheckCircle, Gear, CircleHalf, Archive, Star, XCircle, Circle } from '@phosphor-icons/react';

export const StatusIcon = ({ status, className }: { status: FeatureStatus; className?: string }) => {
  const iconClass = cn('h-4 w-4', className);
  switch (status) {
    case 'discovery': return <Binoculars className={cn(iconClass, 'text-purple-600 dark:text-purple-400')} />;
    case 'validated': return <CheckCircle className={cn(iconClass, 'text-blue-600 dark:text-blue-400')} />;
    case 'in_build': return <Gear className={cn(iconClass, 'text-yellow-600 dark:text-yellow-400')} />;
    case 'in_review': return <CircleHalf className={cn(iconClass, 'text-orange-600 dark:text-orange-400')} />;
    case 'shipped': return <Archive className={cn(iconClass, 'text-emerald-600 dark:text-emerald-400')} />;
    case 'adopted': return <Star className={cn(iconClass, 'text-indigo-600 dark:text-indigo-400')} />;
    case 'killed': return <XCircle className={cn(iconClass, 'text-red-600 dark:text-red-400')} />;
    default: return <Circle className={iconClass} />;
  }
};
