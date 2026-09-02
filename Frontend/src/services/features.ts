import { apiClient } from '@/lib/api-client';
import { Feature, FeatureMilestone } from '@/types/feature';
import { RawFeature, RawFeatureMilestone } from './mapper';

interface FeatureCreatePayload extends Partial<Feature> {
  project_id?: string;
  parent_id?: string;
  owner_id?: string;
}

/**
 * Raw, un-mapped responses - callers pass these through mapFeature /
 * mapFeatureMilestone (see store/issueStore.ts) to get camelCase domain
 * objects. The `Feature`/`FeatureMilestone` return types below are
 * aspirational documentation of the target shape, not what's returned here.
 */
export const featureService = {
  getAll: async (projectId?: string): Promise<RawFeature[]> => {
    const params = projectId ? { project_id: projectId } : {};
    const response = await apiClient.get<RawFeature[]>('/features', { params });
    return response.data;
  },

  getById: async (id: string): Promise<RawFeature> => {
    const response = await apiClient.get<RawFeature>(`/features/${id}`);
    return response.data;
  },

  create: async (data: Partial<Feature>): Promise<RawFeature> => {
    const payload: FeatureCreatePayload = {
      ...data,
      project_id: data.projectId,
      parent_id: data.parentId,
      owner_id: data.ownerId,
    };

    // Clean up camelCase keys
    delete payload.projectId;
    delete payload.parentId;
    delete payload.ownerId;

    const response = await apiClient.post<RawFeature>('/features', payload);
    return response.data;
  },

  update: async (id: string, data: Partial<Feature>): Promise<RawFeature> => {
    const response = await apiClient.patch<RawFeature>(`/features/${id}`, data);
    return response.data;
  },

  createMilestone: async (featureId: string, data: Partial<FeatureMilestone>): Promise<RawFeatureMilestone> => {
    const response = await apiClient.post<RawFeatureMilestone>(`/features/${featureId}/milestones`, data);
    return response.data;
  },

  updateMilestone: async (featureId: string, milestoneId: string, data: Partial<FeatureMilestone>): Promise<RawFeatureMilestone> => {
    const response = await apiClient.patch<RawFeatureMilestone>(`/features/${featureId}/milestones/${milestoneId}`, data);
    return response.data;
  },

  deleteMilestone: async (featureId: string, milestoneId: string): Promise<void> => {
    await apiClient.delete(`/features/${featureId}/milestones/${milestoneId}`);
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/features/${id}`);
  }
};
