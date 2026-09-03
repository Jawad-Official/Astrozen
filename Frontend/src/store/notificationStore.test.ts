import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/services/notifications', () => ({
  notificationService: {
    getAll: vi.fn(),
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
  },
}));
vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

import { useNotificationStore } from './notificationStore';
import { notificationService } from '@/services/notifications';
import { toast } from 'sonner';

const mockedGetAll = vi.mocked(notificationService.getAll);
const mockedMarkAsRead = vi.mocked(notificationService.markAsRead);
const mockedMarkAllAsRead = vi.mocked(notificationService.markAllAsRead);

const baseNotification = (overrides: Partial<{ id: string; is_read: boolean }> = {}) => ({
  id: overrides.id ?? 'n1',
  recipient_id: 'u1',
  type: 'AI_DOC_GENERATED',
  title: 'Doc ready',
  content: 'Your document is ready',
  is_read: overrides.is_read ?? false,
  created_at: '2025-01-01T00:00:00Z',
});

beforeEach(() => {
  useNotificationStore.setState({ notifications: [], unreadCount: 0, isLoading: false });
  vi.clearAllMocks();
});

describe('useNotificationStore.fetchNotifications', () => {
  it('populates notifications and unread count on success', async () => {
    mockedGetAll.mockResolvedValue({
      data: { notifications: [baseNotification()], unread_count: 1 },
    } as any);

    await useNotificationStore.getState().fetchNotifications();

    const state = useNotificationStore.getState();
    expect(state.notifications).toHaveLength(1);
    expect(state.unreadCount).toBe(1);
    expect(state.isLoading).toBe(false);
  });

  it('clears isLoading and shows a toast on failure', async () => {
    mockedGetAll.mockRejectedValue(new Error('network down'));

    await useNotificationStore.getState().fetchNotifications();

    expect(useNotificationStore.getState().isLoading).toBe(false);
    expect(toast.error).toHaveBeenCalled();
  });
});

describe('useNotificationStore.markAsRead', () => {
  it('marks only the target notification read and decrements unreadCount', async () => {
    mockedMarkAsRead.mockResolvedValue({} as any);
    useNotificationStore.setState({
      notifications: [baseNotification({ id: 'n1' }), baseNotification({ id: 'n2' })],
      unreadCount: 2,
    });

    await useNotificationStore.getState().markAsRead('n1');

    const state = useNotificationStore.getState();
    expect(state.notifications.find(n => n.id === 'n1')?.is_read).toBe(true);
    expect(state.notifications.find(n => n.id === 'n2')?.is_read).toBe(false);
    expect(state.unreadCount).toBe(1);
  });

  it('never drives unreadCount below zero', async () => {
    mockedMarkAsRead.mockResolvedValue({} as any);
    useNotificationStore.setState({
      notifications: [baseNotification({ id: 'n1' })],
      unreadCount: 0,
    });

    await useNotificationStore.getState().markAsRead('n1');

    expect(useNotificationStore.getState().unreadCount).toBe(0);
  });

  it('leaves state untouched and toasts on failure', async () => {
    mockedMarkAsRead.mockRejectedValue(new Error('boom'));
    useNotificationStore.setState({
      notifications: [baseNotification({ id: 'n1' })],
      unreadCount: 1,
    });

    await useNotificationStore.getState().markAsRead('n1');

    const state = useNotificationStore.getState();
    expect(state.notifications[0].is_read).toBe(false);
    expect(state.unreadCount).toBe(1);
    expect(toast.error).toHaveBeenCalled();
  });
});

describe('useNotificationStore.markAllAsRead', () => {
  it('marks every notification read and zeroes unreadCount', async () => {
    mockedMarkAllAsRead.mockResolvedValue({} as any);
    useNotificationStore.setState({
      notifications: [baseNotification({ id: 'n1' }), baseNotification({ id: 'n2' })],
      unreadCount: 2,
    });

    await useNotificationStore.getState().markAllAsRead();

    const state = useNotificationStore.getState();
    expect(state.notifications.every(n => n.is_read)).toBe(true);
    expect(state.unreadCount).toBe(0);
  });
});
