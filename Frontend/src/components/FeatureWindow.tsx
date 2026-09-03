/**
 * FeatureWindow is a namespace object (FeatureWindow.List, .Detail, etc.)
 * used across the app - this file re-exports the split-out implementations
 * from src/components/feature-window/ under that same namespace so every
 * existing `FeatureWindow.X` and `FEATURE_*_CONFIG` import keeps working
 * unchanged.
 */
export {
  FEATURE_STATUS_CONFIG,
  FEATURE_HEALTH_CONFIG,
  FEATURE_TYPE_CONFIG,
} from './feature-window/constants';

import { PriorityIcon } from './feature-window/PriorityIcon';
import { StatusIcon } from './feature-window/StatusIcon';
import { HealthIcon } from './feature-window/HealthIcon';
import { FeatureRow } from './feature-window/FeatureRow';
import { FeatureList } from './feature-window/FeatureList';
import { FeatureDetailPanel } from './feature-window/FeatureDetailPanel';

export const FeatureWindow = {
  PriorityIcon,
  StatusIcon,
  HealthIcon,
  Row: FeatureRow,
  List: FeatureList,
  Detail: FeatureDetailPanel,
};
