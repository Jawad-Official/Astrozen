import { apiClient } from '@/lib/api-client';
import { Organization, CreateOrganizationData, InviteCode } from '@/types/auth';

export const organizationService = {
  // Get current user's organization
  getMyOrganization: async (): Promise<Organization> => {
    const response = await apiClient.get<any>('/organizations/me');
    return mapOrganization(response.data);
  },

  // Create new organization
  create: async (data: CreateOrganizationData): Promise<Organization> => {
    const response = await apiClient.post<any>('/organizations', data);
    return mapOrganization(response.data);
  },

  // Join organization via code
  join: async (inviteCode: string): Promise<Organization> => {
    const response = await apiClient.post<any>('/organizations/join', null, {
      params: { invite_code: inviteCode }
    });
    return mapOrganization(response.data);
  },

  // Generate invite code (Admin only)
  generateInviteCode: async (): Promise<InviteCode> => {
    const response = await apiClient.post<any>('/organizations/invite-codes');
    return mapInviteCode(response.data);
  },

  // Get organization members
  getMembers: async (): Promise<any[]> => {
    const response = await apiClient.get<any[]>('/organizations/me/members');
    return response.data;
  }
};

// Mappers
const mapOrganization = (data: any): Organization => ({
  id: data.id,
  name: data.name,
  createdById: data.created_by_id,
  createdAt: data.created_at,
  updatedAt: data.updated_at
});

const mapInviteCode = (data: any): InviteCode => ({
  id: data.id,
  code: data.code,
  organizationId: data.organization_id,
  expiresAt: data.expires_at,
  isActive: data.is_active
});
