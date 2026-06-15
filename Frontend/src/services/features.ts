import { apiClient } from '@/lib/api-client';
import { Feature, FeatureMilestone } from '@/types/feature';

// This is a partial migration of strategyService methods to a dedicated featureService
export const featureService = {
  getAll: async (projectId?: string): Promise<Feature[]> => {
    const params = projectId ? { project_id: projectId } : {};
    const response = await apiClient.get<any[]>('/features', { params });
    // Note: Mappers are currently in strategy.ts, ideally they move to a central mapper
    // For now we'll do simple mapping here or import from strategy
    return response.data; 
  },

  getById: async (id: string): Promise<Feature> => {
    const response = await apiClient.get<any>(`/features/${id}`);
    return response.data;
  },

  create: async (data: any): Promise<Feature> => {
    const payload = {
      ...data,
      project_id: data.projectId ?? data.project_id,
      parent_id: data.parentId ?? data.parent_id,
      owner_id: data.ownerId ?? data.owner_id,
    };
    
    // Clean up camelCase keys
    delete payload.projectId;
    delete payload.parentId;
    delete payload.ownerId;

    const response = await apiClient.post<any>('/features', payload);
    return response.data;
  },

  update: async (id: string, data: any): Promise<Feature> => {
    const response = await apiClient.patch<any>(`/features/${id}`, data);
    return response.data;
  },

  createMilestone: async (featureId: string, data: any): Promise<FeatureMilestone> => {
    const response = await apiClient.post<any>(`/features/${featureId}/milestones`, data);
    return response.data;
  },

  updateMilestone: async (featureId: string, milestoneId: string, data: any): Promise<FeatureMilestone> => {
    const response = await apiClient.patch<any>(`/features/${featureId}/milestones/${milestoneId}`, data);
    return response.data;
  },

  deleteMilestone: async (featureId: string, milestoneId: string): Promise<void> => {
    await apiClient.delete(`/features/${featureId}/milestones/${milestoneId}`);
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/features/${id}`);
  }
};
