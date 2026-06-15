import { apiClient } from '@/lib/api-client';

export interface OrgMember {
  id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  job_title?: string;
  role: string;
}

export const userService = {
  // Get all members in the organization
  getOrganizationMembers: async (): Promise<OrgMember[]> => {
    const response = await apiClient.get<OrgMember[]>('/organizations/me/members');
    return response.data;
  },
};
