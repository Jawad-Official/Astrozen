import { FeatureStatus, FeatureHealth, FeatureType } from '@/types/feature';
import { IssuePriority } from '@/types/issue';

export const FEATURE_STATUS_CONFIG: Record<FeatureStatus, { label: string; color: string }> = {
  discovery: { label: 'Discovery', color: 'text-purple-600 dark:text-purple-400' },
  validated: { label: 'Validated', color: 'text-blue-600 dark:text-blue-400' },
  in_build: { label: 'In Build', color: 'text-yellow-600 dark:text-yellow-400' },
  in_review: { label: 'In Review', color: 'text-orange-600 dark:text-orange-400' },
  shipped: { label: 'Shipped', color: 'text-emerald-600 dark:text-emerald-400' },
  adopted: { label: 'Adopted', color: 'text-indigo-600 dark:text-indigo-400' },
  killed: { label: 'Killed', color: 'text-red-600 dark:text-red-400' },
};

export const FEATURE_HEALTH_CONFIG: Record<FeatureHealth, { label: string; color: string }> = {
  on_track: { label: 'On Track', color: 'text-emerald-600 dark:text-emerald-400' },
  at_risk: { label: 'At Risk', color: 'text-yellow-600 dark:text-yellow-400' },
  off_track: { label: 'Off Track', color: 'text-red-600 dark:text-red-400' },
};

export const FEATURE_TYPE_CONFIG: Record<FeatureType, { label: string; icon: string }> = {
  new_capability: { label: 'New Capability', icon: '✨' },
  enhancement: { label: 'Enhancement', icon: '🔧' },
  experiment: { label: 'Experiment', icon: '🧪' },
  infrastructure: { label: 'Infrastructure', icon: '🏗️' },
};

export const PRIORITY_ORDER: IssuePriority[] = ['urgent', 'high', 'medium', 'low', 'none'];
