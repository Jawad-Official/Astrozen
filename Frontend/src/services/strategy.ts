import { apiClient } from '@/lib/api-client';
import { Feature, CreateFeatureData, CreateMilestoneData, FeatureMilestone } from '@/types/feature';
import { IssuePriority } from '@/types/issue';

export const strategyService = {
  getFeatures: async (projectId: string): Promise<Feature[]> => {
    const response = await apiClient.get<any[]>('/features', { params: { project_id: projectId } });
    return response.data.map(mapFeature);
  },

  getFeature: async (id: string): Promise<Feature> => {
    const response = await apiClient.get<any>(`/features/${id}`);
    return mapFeature(response.data);
  },

  createFeature: async (data: CreateFeatureData): Promise<Feature> => {
    const payload = {
      project_id: data.projectId,
      name: data.name,
      type: data.type
    };
    const response = await apiClient.post<any>('/features', payload);
    return mapFeature(response.data);
  },

  updateFeatureStatus: async (id: string, status: string): Promise<Feature> => {
    const response = await apiClient.patch<any>(`/features/${id}`, { status });
    return mapFeature(response.data);
  },
  
  updateFeatureDetails: async (id: string, data: Partial<Feature>): Promise<Feature> => {
    const payload: Partial<Record<'problem_statement' | 'target_user' | 'expected_outcome' | 'success_metric' | 'validation_evidence', string>> = {};
    if (data.problemStatement) payload.problem_statement = data.problemStatement;
    if (data.targetUser) payload.target_user = data.targetUser;
    if (data.expectedOutcome) payload.expected_outcome = data.expectedOutcome;
    if (data.successMetric) payload.success_metric = data.successMetric;
    if (data.validationEvidence) payload.validation_evidence = data.validationEvidence;
    const response = await apiClient.patch<any>(`/features/${id}`, payload);
    return mapFeature(response.data);
  },

  createMilestone: async (featureId: string, data: CreateMilestoneData): Promise<FeatureMilestone> => {
    const payload = {
      name: data.name,
      description: data.description,
      target_date: data.targetDate,
      parent_id: data.parentId
    };
    const response = await apiClient.post<any>(`/features/${featureId}/milestones`, payload);
    return mapMilestone(response.data);
  }
};

const mapFeature = (data: any): Feature => ({
  id: data.id,
  identifier: data.identifier,
  projectId: data.project_id,
  name: data.name,
  problemStatement: data.problem_statement,
  targetUser: data.target_user,
  expectedOutcome: data.expected_outcome,
  successMetric: data.success_metric,
  type: data.type,
  status: data.status,
  priority: data.priority as IssuePriority,
  validationEvidence: data.validation_evidence,
  health: data.health,
  deliveryConfidence: data.delivery_confidence,
  milestones: data.milestones?.filter((m: any) => !m.parent_id).map(mapMilestone),
  createdAt: data.created_at,
  updatedAt: data.updated_at
});

const mapMilestone = (data: any): FeatureMilestone => ({
  id: data.id,
  featureId: data.feature_id,
  parentId: data.parent_id,
  name: data.name,
  description: data.description,
  targetDate: data.target_date,
  completed: data.completed,
});
