import { cn } from '@/lib/utils';
import { FeatureHealth } from '@/types/feature';

export const HealthIcon = ({ health, className }: { health: FeatureHealth; className?: string }) => {
  switch (health) {
    case 'on_track': return <div className={cn("h-2 w-2 rounded-full bg-emerald-500", className)} />;
    case 'at_risk': return <div className={cn("h-2 w-2 rounded-full bg-yellow-500", className)} />;
    case 'off_track': return <div className={cn("h-2 w-2 rounded-full bg-red-500", className)} />;
    default: return <div className={cn("h-2 w-2 rounded-full bg-muted", className)} />;
  }
};
