import { apiClient } from '@/lib/api-client';
import { Feature, CreateFeatureData, CreateMilestoneData, FeatureMilestone } from '@/types/feature';
import { mapFeature, mapFeatureMilestone, RawFeature, RawFeatureMilestone } from './mapper';

export const strategyService = {
  getFeatures: async (projectId: string): Promise<Feature[]> => {
    const response = await apiClient.get<RawFeature[]>('/features', { params: { project_id: projectId } });
    return response.data.map(mapFeature);
  },

  getFeature: async (id: string): Promise<Feature> => {
    const response = await apiClient.get<RawFeature>(`/features/${id}`);
    return mapFeature(response.data);
  },

  createFeature: async (data: CreateFeatureData): Promise<Feature> => {
    const payload = {
      project_id: data.projectId,
      name: data.name,
      type: data.type
    };
    const response = await apiClient.post<RawFeature>('/features', payload);
    return mapFeature(response.data);
  },

  updateFeatureStatus: async (id: string, status: string): Promise<Feature> => {
    const response = await apiClient.patch<RawFeature>(`/features/${id}`, { status });
    return mapFeature(response.data);
  },

  updateFeatureDetails: async (id: string, data: Partial<Feature>): Promise<Feature> => {
    const payload: Partial<Record<'problem_statement' | 'target_user' | 'expected_outcome' | 'success_metric' | 'validation_evidence', string>> = {};
    if (data.problemStatement) payload.problem_statement = data.problemStatement;
    if (data.targetUser) payload.target_user = data.targetUser;
    if (data.expectedOutcome) payload.expected_outcome = data.expectedOutcome;
    if (data.successMetric) payload.success_metric = data.successMetric;
    if (data.validationEvidence) payload.validation_evidence = data.validationEvidence;
    const response = await apiClient.patch<RawFeature>(`/features/${id}`, payload);
    return mapFeature(response.data);
  },

  createMilestone: async (featureId: string, data: CreateMilestoneData): Promise<FeatureMilestone> => {
    const payload = {
      name: data.name,
      description: data.description,
      target_date: data.targetDate,
      parent_id: data.parentId
    };
    const response = await apiClient.post<RawFeatureMilestone>(`/features/${featureId}/milestones`, payload);
    return mapFeatureMilestone(response.data);
  }
};
