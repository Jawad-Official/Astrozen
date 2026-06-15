export interface User {
  id: string;
  email: string;
  fullName: string;
  firstName: string;
  lastName: string;
  jobTitle?: string;
  role: string;
  organizationId?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterData {
  email: string;
  firstName: string;
  lastName: string;
  jobTitle?: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
}

export interface Organization {
  id: string;
  name: string;
  createdById?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrganizationData {
  name: string;
}

export interface InviteCode {
  id: string;
  code: string;
  organizationId: string;
  expiresAt: string;
  isActive: boolean;
}

export interface Team {
  id: string;
  organizationId: string;
  name: string;
  identifier: string;
  leaders: User[];
  members?: User[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateTeamData {
  name: string;
  identifier?: string;
  leaderId?: string;
  memberIds?: string[];
  importFromTeamId?: string;
}
