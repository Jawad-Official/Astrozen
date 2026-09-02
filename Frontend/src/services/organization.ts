import { apiClient } from '@/lib/api-client';
import { Organization, CreateOrganizationData, InviteCode } from '@/types/auth';

/** Matches backend OrganizationMember schema - distinct from RawUser (team
 * leaders/members), which doesn't include full_name. */
export interface RawOrgMember {
  id: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  email: string;
  job_title?: string;
  role: string;
}

interface RawOrganization {
  id: string;
  name: string;
  created_by_id?: string;
  created_at: string;
  updated_at: string;
}

interface RawInviteCode {
  id: string;
  code: string;
  organization_id: string;
  expires_at: string;
  is_active: boolean;
}

export const organizationService = {
  // Get current user's organization
  getMyOrganization: async (): Promise<Organization> => {
    const response = await apiClient.get<RawOrganization>('/organizations/me');
    return mapOrganization(response.data);
  },

  // Create new organization
  create: async (data: CreateOrganizationData): Promise<Organization> => {
    const response = await apiClient.post<RawOrganization>('/organizations', data);
    return mapOrganization(response.data);
  },

  // Join organization via code
  join: async (inviteCode: string): Promise<Organization> => {
    const response = await apiClient.post<RawOrganization>('/organizations/join', null, {
      params: { invite_code: inviteCode }
    });
    return mapOrganization(response.data);
  },

  // Generate invite code (Admin only)
  generateInviteCode: async (): Promise<InviteCode> => {
    const response = await apiClient.post<RawInviteCode>('/organizations/invite-codes');
    return mapInviteCode(response.data);
  },

  // Get organization members (raw shape - see CreateTeamDialog for a consumer
  // that reads snake_case fields directly rather than through mapUser)
  getMembers: async (): Promise<RawOrgMember[]> => {
    const response = await apiClient.get<RawOrgMember[]>('/organizations/me/members');
    return response.data;
  }
};

// Mappers
const mapOrganization = (data: RawOrganization): Organization => ({
  id: data.id,
  name: data.name,
  createdById: data.created_by_id,
  createdAt: data.created_at,
  updatedAt: data.updated_at
});

const mapInviteCode = (data: RawInviteCode): InviteCode => ({
  id: data.id,
  code: data.code,
  organizationId: data.organization_id,
  expiresAt: data.expires_at,
  isActive: data.is_active
});
