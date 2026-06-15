import { apiClient as api } from '@/lib/api-client';

export interface Notification {
  id: string;
  recipient_id: string;
  actor_id?: string;
  actor_name?: string;
  type: string;
  target_id?: string;
  target_type?: string;
  title: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

export interface NotificationList {
  notifications: Notification[];
  unread_count: number;
}

export const notificationService = {
  getAll: (limit: number = 50) => 
    api.get<NotificationList>('/notifications', { params: { limit } }),
    
  markAsRead: (id: string) => 
    api.patch<Notification>(`/notifications/${id}/read`),
    
  markAllAsRead: () => 
    api.post<{ message: string, count: number }>('/notifications/read-all'),
};
