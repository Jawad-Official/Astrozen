import { apiClient } from '@/lib/api-client';
import { Team, CreateTeamData } from '@/types/auth';
import { mapUser, RawUser } from './mapper';

interface RawTeam {
  id: string;
  organization_id: string;
  name: string;
  identifier: string;
  leaders?: RawUser[];
  members?: RawUser[];
  created_at: string;
  updated_at: string;
}

export interface TeamUpdateData {
  name?: string;
  identifier?: string;
  leader_ids?: string[];
  leaderIds?: string[];
  member_ids?: string[];
  memberIds?: string[];
}

interface TeamUpdatePayload {
  name?: string;
  identifier?: string;
  leader_ids?: string[];
  member_ids?: string[];
}

export const teamService = {
  // List all teams in my org
  getAll: async (): Promise<Team[]> => {
    const response = await apiClient.get<RawTeam[]>('/teams');
    return response.data.map(mapTeam);
  },

  // Get single team
  getById: async (id: string): Promise<Team> => {
    const response = await apiClient.get<RawTeam>(`/teams/${id}`);
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
    const response = await apiClient.post<RawTeam>('/teams', payload);
    return mapTeam(response.data);
  },

  // Update team
  update: async (id: string, data: TeamUpdateData): Promise<Team> => {
    const payload: TeamUpdatePayload = {};
    if (data.name) payload.name = data.name;
    if (data.identifier) payload.identifier = data.identifier;
    if (data.leader_ids || data.leaderIds) {
      payload.leader_ids = data.leader_ids || data.leaderIds;
    }
    if (data.member_ids || data.memberIds) {
      payload.member_ids = data.member_ids || data.memberIds;
    }

    const response = await apiClient.patch<RawTeam>(`/teams/${id}`, payload);
    return mapTeam(response.data);
  },

  // Delete team
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/teams/${id}`);
  }
};

// Mapper
const mapTeam = (data: RawTeam): Team => ({
  id: data.id,
  organizationId: data.organization_id,
  name: data.name,
  identifier: data.identifier,
  leaders: (data.leaders || []).map(mapUser),
  members: (data.members || []).map(mapUser),
  createdAt: data.created_at,
  updatedAt: data.updated_at
});
