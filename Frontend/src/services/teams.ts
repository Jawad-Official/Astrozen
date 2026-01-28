import { apiClient } from '@/lib/api-client';
import { Team, CreateTeamData } from '@/types/auth';

export const teamService = {
  // List all teams in my org
  getAll: async (): Promise<Team[]> => {
    const response = await apiClient.get<any[]>('/teams');
    return response.data.map(mapTeam);
  },

  // Get single team
  getById: async (id: string): Promise<Team> => {
    const response = await apiClient.get<any>(`/teams/${id}`);
    return mapTeam(response.data);
  },

  // Create team
  create: async (data: CreateTeamData): Promise<Team> => {
    const payload = {
      name: data.name,
      identifier: data.identifier,
      leader_ids: data.leaderId ? [data.leaderId] : [],
      member_ids: data.memberIds,
      import_from_team_id: data.importFromTeamId
    };
    const response = await apiClient.post<any>('/teams', payload);
    return mapTeam(response.data);
  },

  // Update team
  update: async (id: string, data: any): Promise<Team> => {
    const payload: any = {};
    if (data.name) payload.name = data.name;
    if (data.identifier) payload.identifier = data.identifier;
    if (data.leader_ids || data.leaderIds) {
      payload.leader_ids = data.leader_ids || data.leaderIds;
    }
    if (data.member_ids || data.memberIds) {
      payload.member_ids = data.member_ids || data.memberIds;
    }

    const response = await apiClient.patch<any>(`/teams/${id}`, payload);
    return mapTeam(response.data);
  },

  // Delete team
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/teams/${id}`);
  }
};

// Mapper
const mapTeam = (data: any): Team => ({
  id: data.id,
  organizationId: data.organization_id,
  name: data.name,
  identifier: data.identifier,
  leaders: (data.leaders || []).map((l: any) => ({
    id: l.id,
    email: l.email,
    firstName: l.first_name,
    lastName: l.last_name,
    fullName: `${l.first_name} ${l.last_name}`,
    jobTitle: l.job_title,
    organizationId: l.organization_id,
    isActive: l.is_active,
    role: l.role,
    createdAt: l.created_at,
    updatedAt: l.updated_at
  })),
  members: (data.members || []).map((m: any) => ({
    id: m.id,
    email: m.email,
    firstName: m.first_name,
    lastName: m.last_name,
    fullName: `${m.first_name} ${m.last_name}`,
    jobTitle: m.job_title,
    organizationId: m.organization_id,
    isActive: m.is_active,
    role: m.role,
    createdAt: m.created_at,
    updatedAt: m.updated_at
  })),
  createdAt: data.created_at,
  updatedAt: data.updated_at
});
