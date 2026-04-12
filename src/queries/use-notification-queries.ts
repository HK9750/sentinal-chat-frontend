'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/queries/query-keys';
import {
  getNotificationSettings,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  sortNotifications,
  updateNotificationSettings,
} from '@/services/notification-service';
import { useNotificationStore } from '@/stores/notification-store';
import type { NotificationItem, NotificationListPayload, NotificationSettings } from '@/types';

function setUnreadStoreCount(count: number) {
  useNotificationStore.getState().setUnreadCount(Math.max(0, count));
}

export function setNotificationBadgeCount(
  queryClient: ReturnType<typeof useQueryClient>,
  unreadCount: number
) {
  const normalized = Math.max(0, unreadCount);
  queryClient.setQueryData<number>(queryKeys.notificationBadge, normalized);
  setUnreadStoreCount(normalized);
}

export function useNotifications(unreadOnly = false, enabled = true) {
  return useQuery({
    queryKey: queryKeys.notifications(unreadOnly),
    queryFn: () => listNotifications(1, 60, unreadOnly),
    enabled,
    staleTime: 10_000,
  });
}

export function useNotificationBadgeCount() {
  return useQuery({
    queryKey: queryKeys.notificationBadge,
    queryFn: async () => (await listNotifications(1, 1, true)).total,
    staleTime: 10_000,
  });
}

export function useNotificationSettings() {
  return useQuery({
    queryKey: queryKeys.notificationSettings,
    queryFn: getNotificationSettings,
    staleTime: 30_000,
  });
}

export function useUpdateNotificationSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: Partial<NotificationSettings>) => updateNotificationSettings(payload),
    onSuccess: (settings) => {
      queryClient.setQueryData(queryKeys.notificationSettings, settings);
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications(false) });
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications(true) });
    },
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationId: string) => markNotificationRead(notificationId),
    onSuccess: (_, notificationId) => {
      patchNotificationReadState(queryClient, notificationId);
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => {
      markAllNotificationsReadState(queryClient);
    },
  });
}

export function markAllNotificationsReadState(queryClient: ReturnType<typeof useQueryClient>) {
  for (const unreadOnly of [false, true]) {
    queryClient.setQueryData<NotificationListPayload | undefined>(
      queryKeys.notifications(unreadOnly),
      (current) => {
        if (!current) {
          return current;
        }
        return {
          ...current,
          items: current.items.map((item) =>
            item.is_read ? item : { ...item, is_read: true, read_at: new Date().toISOString() }
          ),
          total: unreadOnly ? 0 : current.total,
        };
      }
    );
  }
  setNotificationBadgeCount(queryClient, 0);
}

export function patchNotificationReadState(queryClient: ReturnType<typeof useQueryClient>, notificationId: string) {
  const existing = queryClient
    .getQueryData<NotificationListPayload>(queryKeys.notifications(false))
    ?.items.find((item) => item.id === notificationId);
  const wasUnread = existing ? !existing.is_read : false;

  for (const unreadOnly of [false, true]) {
    queryClient.setQueryData<NotificationListPayload | undefined>(
      queryKeys.notifications(unreadOnly),
      (current) => {
        if (!current) {
          return current;
        }
        const nextItems = current.items
          .map((item) => (item.id === notificationId ? { ...item, is_read: true, read_at: new Date().toISOString() } : item))
          .filter((item) => (unreadOnly ? !item.is_read : true));
        return {
          ...current,
          items: sortNotifications(nextItems),
          total: unreadOnly ? nextItems.length : current.total,
        };
      }
    );
  }

  const unreadList = queryClient.getQueryData<NotificationListPayload>(
    queryKeys.notifications(true)
  );
  if (unreadList) {
    setNotificationBadgeCount(queryClient, unreadList.total);
    return;
  }

  queryClient.setQueryData<number | undefined>(
    queryKeys.notificationBadge,
    (current) => {
      if (typeof current !== 'number') {
        return current;
      }
      const next = Math.max(0, current - (wasUnread ? 1 : 0));
      setUnreadStoreCount(next);
      return next;
    }
  );
}

export function prependNotification(queryClient: ReturnType<typeof useQueryClient>, notification: NotificationItem) {
  const existingFromAll = queryClient
    .getQueryData<NotificationListPayload>(queryKeys.notifications(false))
    ?.items.find((item) => item.id === notification.id);
  const existingFromUnread = queryClient
    .getQueryData<NotificationListPayload>(queryKeys.notifications(true))
    ?.items.find((item) => item.id === notification.id);
  const existing = existingFromAll ?? existingFromUnread;
  const unreadDelta = !existing
    ? notification.is_read
      ? 0
      : 1
    : existing.is_read === notification.is_read
      ? 0
      : notification.is_read
        ? -1
        : 1;

  for (const unreadOnly of [false, true]) {
    queryClient.setQueryData<NotificationListPayload | undefined>(
      queryKeys.notifications(unreadOnly),
      (current) => {
        if (unreadOnly && notification.is_read) {
          return current;
        }

        const base = current ?? { items: [], total: 0 };
        const alreadyExists = base.items.some((item) => item.id === notification.id);
        const withoutExisting = base.items.filter((item) => item.id !== notification.id);
        const nextItems = sortNotifications(
          unreadOnly
            ? [notification, ...withoutExisting].filter((item) => !item.is_read)
            : [notification, ...withoutExisting]
        );
        return {
          ...base,
          items: nextItems,
          total: unreadOnly
            ? Math.max(0, base.total + unreadDelta)
            : alreadyExists
              ? base.total
              : base.total + 1,
        };
      }
    );
  }

  queryClient.setQueryData<number | undefined>(queryKeys.notificationBadge, (current) => {
    if (typeof current === 'number') {
      const next = Math.max(0, current + unreadDelta);
      setUnreadStoreCount(next);
      return next;
    }

    const unreadList = queryClient.getQueryData<NotificationListPayload>(queryKeys.notifications(true));
    if (unreadList) {
      setUnreadStoreCount(unreadList.total);
      return unreadList.total;
    }

    if (unreadDelta > 0) {
      setUnreadStoreCount(unreadDelta);
      return unreadDelta;
    }

    return current;
  });
}
