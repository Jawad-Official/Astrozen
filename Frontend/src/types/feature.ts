import { IssuePriority } from './issue';

export type FeatureType = 'new_capability' | 'enhancement' | 'experiment' | 'infrastructure';
export type FeatureStatus = 'discovery' | 'validated' | 'in_build' | 'in_review' | 'shipped' | 'adopted' | 'killed';
export type FeatureHealth = 'on_track' | 'at_risk' | 'off_track';

export const FEATURE_STATUS_CONFIG: Record<FeatureStatus, { label: string; color: string }> = {
  discovery: { label: 'Discovery', color: 'text-purple-400' },
  validated: { label: 'Validated', color: 'text-blue-400' },
  in_build: { label: 'In Build', color: 'text-yellow-400' },
  in_review: { label: 'In Review', color: 'text-orange-400' },
  shipped: { label: 'Shipped', color: 'text-emerald-400' },
  adopted: { label: 'Adopted', color: 'text-indigo-400' },
  killed: { label: 'Killed', color: 'text-red-400' },
};

export const FEATURE_HEALTH_CONFIG: Record<FeatureHealth, { label: string; color: string }> = {
  on_track: { label: 'On Track', color: 'text-emerald-400' },
  at_risk: { label: 'At Risk', color: 'text-yellow-400' },
  off_track: { label: 'Off Track', color: 'text-red-400' },
};

export interface Feature {
  id: string;
  identifier: string;
  projectId: string;
  ownerId?: string;
  parentId?: string;
  name: string;
  
  // Core Definition
  problemStatement?: string;
  targetUser?: string;
  expectedOutcome?: string;
  successMetric?: string;
  
  type: FeatureType;
  status: FeatureStatus;
  priority: IssuePriority;
  validationEvidence?: string;
  
  health: FeatureHealth;
  deliveryConfidence?: number;
  
  milestones?: FeatureMilestone[];
  subFeatures?: Feature[];
  createdAt: string;
  updatedAt: string;
}

export interface FeatureMilestone {
  id: string;
  featureId: string;
  parentId?: string;
  name: string;
  description?: string;
  targetDate?: string;
  completed: boolean;
}

export interface CreateFeatureData {
  projectId: string;
  name: string;
  type?: FeatureType;
  priority?: IssuePriority;
  parentId?: string;
  status?: FeatureStatus;
  health?: FeatureHealth;
}

export interface CreateMilestoneData {
  name: string;
  description?: string;
  targetDate?: string;
  parentId?: string;
}

export interface Subtask {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  tools?: string[];
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  level: number;
  dependencies: string[];
  subtasks: Subtask[];
}
