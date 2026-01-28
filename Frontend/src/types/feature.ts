import { IssuePriority } from './issue';

export type FeatureType = 'new_capability' | 'enhancement' | 'experiment' | 'infrastructure';
export type FeatureStatus = 'discovery' | 'validated' | 'in_build' | 'in_review' | 'shipped' | 'adopted' | 'killed';
export type FeatureHealth = 'on_track' | 'at_risk' | 'off_track';

export interface Feature {
  id: string;
  identifier: string;
  projectId: string;
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
  createdAt: string;
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
