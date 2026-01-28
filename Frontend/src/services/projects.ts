import { apiClient } from '@/lib/api-client';
import { Project } from '@/types/issue';
import { mapProject } from './mapper';

export const projectService = {
  getAll: async (): Promise<Project[]> => {
    const response = await apiClient.get<any[]>('/projects');
    return response.data.map(mapProject);
  },

  getById: async (id: string): Promise<Project> => {
    const response = await apiClient.get<any>(`/projects/${id}`);
    return mapProject(response.data);
  },

  create: async (data: Partial<Project>): Promise<Project> => {
    const payload: any = {
      name: data.name,
      icon: data.icon,
      color: data.color || 'blue',
      description: data.description,
      status: data.status || 'backlog',
      health: data.health || 'no_updates',
      priority: data.priority || 'none',
      team_id: data.teamId,
    };

    if (data.lead) payload.lead_id = data.lead;
    if (data.startDate) {
      payload.start_date = data.startDate instanceof Date 
        ? data.startDate.toISOString().split('T')[0] 
        : data.startDate;
    }
    if (data.targetDate) {
      payload.target_date = data.targetDate instanceof Date 
        ? data.targetDate.toISOString().split('T')[0] 
        : data.targetDate;
    }

    const response = await apiClient.post<any>('/projects', payload);
    return mapProject(response.data);
  },

  update: async (id: string, data: Partial<Project>): Promise<Project> => {
    const payload: any = {};
    
    // Explicitly map allowed fields only if they are provided
    if (data.name !== undefined) payload.name = data.name;
    if (data.icon !== undefined) payload.icon = data.icon;
    if (data.color !== undefined) payload.color = data.color;
    if (data.description !== undefined) payload.description = data.description;
    if (data.status !== undefined) payload.status = data.status;
    if (data.health !== undefined) payload.health = data.health;
    if (data.priority !== undefined) payload.priority = data.priority;
    if (data.isFavorite !== undefined) payload.is_favorite = data.isFavorite;
    
    // Map lead
    if ('lead' in data) {
      payload.lead_id = data.lead || null;
    }
    
    // Map members (Crucial for the "add members" fix)
    // The backend expects "member_ids"
    if ('members' in data && Array.isArray(data.members)) {
      payload.member_ids = data.members.filter(m => typeof m === 'string' && m.length > 0);
    }
    
    // Map teams
    if ('teams' in data && Array.isArray(data.teams)) {
      payload.team_ids = data.teams.filter(t => typeof t === 'string' && t.length > 0);
    }

    // Format dates
    if (data.startDate !== undefined) {
      payload.start_date = data.startDate instanceof Date 
        ? data.startDate.toISOString().split('T')[0] 
        : data.startDate || null;
    }
    
    if (data.targetDate !== undefined) {
      payload.target_date = data.targetDate instanceof Date 
        ? data.targetDate.toISOString().split('T')[0] 
        : data.targetDate || null;
    }

    const response = await apiClient.patch<any>(`/projects/${id}`, payload);
    return mapProject(response.data);
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/projects/${id}`);
  },

  addUpdate: async (projectId: string, data: { content: string, health: string }): Promise<any> => {
    const payload = {
      project_id: projectId,
      content: data.content,
      health: data.health
    };
    const response = await apiClient.post(`/projects/${projectId}/updates`, payload);
    return response.data;
  },

  deleteUpdate: async (projectId: string, updateId: string): Promise<void> => {
    await apiClient.delete(`/projects/${projectId}/updates/${updateId}`);
  },

  addResource: async (projectId: string, data: { name: string, url: string, type: string }): Promise<any> => {
    const response = await apiClient.post(`/projects/${projectId}/resources`, data);
    return response.data;
  },

  deleteResource: async (projectId: string, resourceId: string): Promise<void> => {
    await apiClient.delete(`/projects/${projectId}/resources/${resourceId}`);
  },

  addUpdateComment: async (projectId: string, updateId: string, content: string, parentId?: string): Promise<any> => {
    const payload = {
      update_id: updateId,
      content,
      parent_id: parentId
    };
    const response = await apiClient.post(`/projects/${projectId}/updates/${updateId}/comments`, payload);
    return response.data;
  },

  deleteUpdateComment: async (projectId: string, updateId: string, commentId: string): Promise<void> => {
    await apiClient.delete(`/projects/${projectId}/updates/${updateId}/comments/${commentId}`);
  },

  toggleUpdateReaction: async (projectId: string, updateId: string, emoji: string): Promise<any> => {
    const payload = {
      update_id: updateId,
      emoji
    };
    const response = await apiClient.post(`/projects/${projectId}/updates/${updateId}/reactions`, payload);
    return response.data;
  },

  toggleUpdateCommentReaction: async (projectId: string, updateId: string, commentId: string, emoji: string): Promise<any> => {
    const payload = {
      comment_id: commentId,
      emoji
    };
    const response = await apiClient.post(`/projects/${projectId}/updates/${updateId}/comments/${commentId}/reactions`, payload);
    return response.data;
  },
};
