import { apiClient, unwrapData } from '@/services/api-client';
import type {
  MarkAllNotificationsReadPayload,
  MarkNotificationReadPayload,
  NotificationItem,
  NotificationListPayload,
  NotificationSettings,
} from '@/types';

const NOTIFICATION_ROUTES = {
  list: '/v1/notifications',
  markRead: (notificationId: string) => `/v1/notifications/${notificationId}/read`,
  markAllRead: '/v1/notifications/read-all',
  settings: '/v1/users/notification-settings',
} as const;

export async function listNotifications(
  page = 1,
  limit = 30,
  unreadOnly = false
): Promise<NotificationListPayload> {
  return unwrapData<NotificationListPayload>(
    apiClient.get(NOTIFICATION_ROUTES.list, {
      params: {
        page,
        limit,
        unread_only: unreadOnly,
      },
    })
  );
}

export async function markNotificationRead(notificationId: string): Promise<MarkNotificationReadPayload> {
  return unwrapData<MarkNotificationReadPayload>(
    apiClient.post(NOTIFICATION_ROUTES.markRead(notificationId))
  );
}

export async function markAllNotificationsRead(): Promise<MarkAllNotificationsReadPayload> {
  return unwrapData<MarkAllNotificationsReadPayload>(
    apiClient.post(NOTIFICATION_ROUTES.markAllRead)
  );
}

export async function getNotificationSettings(): Promise<NotificationSettings> {
  return unwrapData<NotificationSettings>(apiClient.get(NOTIFICATION_ROUTES.settings));
}

export async function updateNotificationSettings(
  payload: Partial<NotificationSettings>
): Promise<NotificationSettings> {
  return unwrapData<NotificationSettings>(apiClient.patch(NOTIFICATION_ROUTES.settings, payload));
}

export function sortNotifications(items: NotificationItem[]): NotificationItem[] {
  return [...items].sort((left, right) => {
    return new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
  });
}
