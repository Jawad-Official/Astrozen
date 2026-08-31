import { create } from 'zustand';
import { toast } from 'sonner';
import { notificationService, Notification } from '@/services/notifications';

interface NotificationStore {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  
  fetchNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,

  fetchNotifications: async () => {
    set({ isLoading: true });
    try {
      const res = await notificationService.getAll();
      set({ 
        notifications: res.data.notifications, 
        unreadCount: res.data.unread_count,
        isLoading: false 
      });
    } catch (error: any) {
      console.error('Failed to fetch notifications', error);
      toast.error(error?.response?.data?.detail || error?.message || "Failed to fetch notifications");
      set({ isLoading: false });
    }
  },

  markAsRead: async (id: string) => {
    try {
      await notificationService.markAsRead(id);
      set((state) => ({
        notifications: state.notifications.map(n =>
          n.id === id ? { ...n, is_read: true } : n
        ),
        unreadCount: Math.max(0, state.unreadCount - 1)
      }));
    } catch (error: any) {
      console.error('Failed to mark notification as read', error);
      toast.error(error?.response?.data?.detail || error?.message || "Failed to mark notification as read");
    }
  },

  markAllAsRead: async () => {
    try {
      await notificationService.markAllAsRead();
      set((state) => ({
        notifications: state.notifications.map(n => ({ ...n, is_read: true })),
        unreadCount: 0
      }));
    } catch (error: any) {
      console.error('Failed to mark all notifications as read', error);
      toast.error(error?.response?.data?.detail || error?.message || "Failed to mark all notifications as read");
    }
  }
}));
