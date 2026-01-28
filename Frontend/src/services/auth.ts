import { apiClient } from '@/lib/api-client';
import { LoginCredentials, RegisterData, User, AuthResponse } from '@/types/auth';

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
      // username removed
      first_name: data.firstName,
      last_name: data.lastName,
      job_title: data.jobTitle,
      password: data.password
    };
    const response = await apiClient.post<any>('/auth/register', payload);
    return mapUser(response.data);
  },

  getCurrentUser: async (): Promise<User> => {
    const response = await apiClient.get<any>('/auth/me');
    return mapUser(response.data);
  },

  logout: () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  },
};

const mapUser = (data: any): User => ({
  id: data.id,
  email: data.email,
  // username removed
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
