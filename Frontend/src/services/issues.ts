import { apiClient } from '@/lib/api-client';
import { Issue, IssueStatus, IssuePriority, Comment, Activity } from '@/types/issue';
import { mapIssue, mapComment, mapActivity } from './mapper';

export interface IssueFilterParams {
  status?: IssueStatus[];
  priority?: IssuePriority[];
  project_id?: string;
  assignee_id?: string;
  search?: string;
  skip?: number;
  limit?: number;
}

export interface IssueListResponse {
  issues: Issue[];
  total: number;
}

export const issueService = {
  getAll: async (params?: IssueFilterParams): Promise<IssueListResponse> => {
    const response = await apiClient.get<any>('/issues', { params });
    return {
      issues: response.data.issues.map(mapIssue),
      total: response.data.total
    };
  },

  getMyIssues: async (): Promise<Issue[]> => {
    const response = await apiClient.get<any[]>('/issues/my-issues');
    return response.data.map(mapIssue);
  },
  
  getInbox: async (): Promise<Issue[]> => {
    const response = await apiClient.get<any[]>('/issues/inbox');
    return response.data.map(mapIssue);
  },

  create: async (data: Partial<Issue>): Promise<Issue> => {
    const payload = {
      title: data.title,
      description: data.description,
      issue_type: data.issueType, // Added issue_type
      status: data.status,
      priority: data.priority,
      team_id: data.teamId, // Added team_id
      feature_id: data.featureId,
      milestone_id: data.milestoneId, // Added milestone_id
      assignee_id: data.assignee,
      parent_id: data.parentId,
      due_date: data.dueDate,
      label_ids: data.labels?.map(l => l.id) || []
    };
    const response = await apiClient.post<any>('/issues', payload);
    return mapIssue(response.data);
  },

  update: async (id: string, data: Partial<Issue>): Promise<Issue> => {
    const payload: any = { ...data };
    if (data.issueType) payload.issue_type = data.issueType;
    if (data.featureId) payload.feature_id = data.featureId;
    if (data.milestoneId !== undefined) payload.milestone_id = data.milestoneId; // Added milestone_id
    if (data.assignee) payload.assignee_id = data.assignee;
    if (data.dueDate) payload.due_date = data.dueDate;
    if (data.labels) payload.label_ids = data.labels.map(l => l.id);
    
    // Remove camelCase keys
    delete payload.issueType;
    delete payload.featureId;
    delete payload.milestoneId; // Remove milestoneId
    delete payload.projectId;
    delete payload.assignee;
    delete payload.dueDate;
    delete payload.labels;

    const response = await apiClient.patch<any>(`/issues/${id}`, payload);
    return mapIssue(response.data);
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/issues/${id}`);
  },

  getComments: async (issueId: string): Promise<Comment[]> => {
    const response = await apiClient.get<any[]>(`/issues/${issueId}/comments`);
    return response.data.map(mapComment);
  },

  addComment: async (issueId: string, content: string): Promise<Comment> => {
    const response = await apiClient.post<any>(`/issues/${issueId}/comments`, { content });
    return mapComment(response.data);
  },

  getActivities: async (issueId: string): Promise<Activity[]> => {
    const response = await apiClient.get<any[]>(`/issues/${issueId}/activities`);
    return response.data.map(mapActivity);
  },
};
