import { apiClient } from '@/lib/api-client';
import { LoginCredentials, RegisterData, User, AuthResponse } from '@/types/auth';

interface UserResponse {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  job_title?: string;
  role: string;
  organization_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const authService = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const formData = new URLSearchParams();
    formData.append('username', credentials.username);
    formData.append('password', credentials.password);
    
    const response = await apiClient.post<AuthResponse>('/auth/login', formData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    return response.data;
  },

  register: async (data: RegisterData): Promise<User> => {
    const payload = {
      email: data.email,
      first_name: data.firstName,
      last_name: data.lastName,
      job_title: data.jobTitle,
      password: data.password
    };
    const response = await apiClient.post<UserResponse>('/auth/register', payload);
    return mapUser(response.data);
  },

  getCurrentUser: async (): Promise<User> => {
    const response = await apiClient.get<UserResponse>('/auth/me');
    return mapUser(response.data);
  },

  logout: () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  },
};

const mapUser = (data: UserResponse): User => ({
  id: data.id,
  email: data.email,
  firstName: data.first_name,
  lastName: data.last_name,
  fullName: `${data.first_name} ${data.last_name}`,
  jobTitle: data.job_title,
  role: data.role,
  organizationId: data.organization_id,
  isActive: data.is_active,
  createdAt: data.created_at,
  updatedAt: data.updated_at
});
