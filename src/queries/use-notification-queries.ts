'use client';

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';
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

const DEFAULT_PAGE_SIZE = 20;

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

export function useInfiniteNotifications(unreadOnly = false, enabled = true) {
  return useInfiniteQuery({
    queryKey: queryKeys.infiniteNotifications(unreadOnly),
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const page = Number(pageParam) || 1;
      const response = await listNotifications(page, DEFAULT_PAGE_SIZE, unreadOnly);
      return {
        ...response,
        page,
      };
    },
    getNextPageParam: (lastPage) => {
      const loaded = lastPage.page * DEFAULT_PAGE_SIZE;
      return loaded < lastPage.total ? lastPage.page + 1 : undefined;
    },
    enabled,
    staleTime: 10_000,
  });
}

export function flattenInfiniteNotifications(
  data: InfiniteData<NotificationListPayload & { page: number }> | undefined
): NotificationListPayload {
  if (!data) {
    return { items: [], total: 0 };
  }

  const byId = new Map<string, NotificationItem>();
  let total = 0;
  for (const page of data.pages) {
    total = Math.max(total, page.total);
    for (const item of page.items) {
      byId.set(item.id, item);
    }
  }
  const items = sortNotifications(Array.from(byId.values()));

  return {
    items,
    total,
  };
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
      queryClient.invalidateQueries({ queryKey: queryKeys.infiniteNotifications(false) });
      queryClient.invalidateQueries({ queryKey: queryKeys.infiniteNotifications(true) });
    },
  });
}

function updateInfiniteQueryItems(
  queryClient: ReturnType<typeof useQueryClient>,
  unreadOnly: boolean,
  updater: (item: NotificationItem) => NotificationItem | null
) {
  queryClient.setQueryData<InfiniteData<NotificationListPayload & { page: number }> | undefined>(
    queryKeys.infiniteNotifications(unreadOnly),
    (current) => {
      if (!current) {
        return current;
      }

      let changed = false;
      const pages = current.pages.map((page) => {
        const mapped = page.items
          .map((item) => {
            const next = updater(item);
            if (next !== item) {
              changed = true;
            }
            return next;
          })
          .filter((item): item is NotificationItem => item !== null);

        if (mapped.length !== page.items.length) {
          changed = true;
        }

        return {
          ...page,
          items: mapped,
          total: unreadOnly ? mapped.length : page.total,
        };
      });

      if (!changed) {
        return current;
      }

      return {
        ...current,
        pages,
      };
    }
  );
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
    queryClient.setQueryData<InfiniteData<NotificationListPayload & { page: number }> | undefined>(
      queryKeys.infiniteNotifications(unreadOnly),
      (current) => {
        if (!current) {
          return current;
        }

        const pages = current.pages.map((page) => {
          const items = page.items
            .map((item) => ({
              ...item,
              is_read: true,
              read_at: item.read_at ?? new Date().toISOString(),
            }))
            .filter((item) => (unreadOnly ? !item.is_read : true));

          return {
            ...page,
            items,
            total: unreadOnly ? 0 : page.total,
          };
        });

        return {
          ...current,
          pages,
        };
      }
    );
  }

  setNotificationBadgeCount(queryClient, 0);
}

export function patchNotificationReadState(
  queryClient: ReturnType<typeof useQueryClient>,
  notificationId: string
) {
  let wasUnread = false;

  updateInfiniteQueryItems(queryClient, false, (item) => {
    if (item.id !== notificationId) {
      return item;
    }
    if (!item.is_read) {
      wasUnread = true;
    }
    return {
      ...item,
      is_read: true,
      read_at: item.read_at ?? new Date().toISOString(),
    };
  });

  updateInfiniteQueryItems(queryClient, true, (item) => {
    if (item.id === notificationId) {
      return null;
    }
    return item;
  });

  queryClient.setQueryData<number | undefined>(queryKeys.notificationBadge, (current) => {
    if (typeof current !== 'number') {
      return current;
    }
    const next = Math.max(0, current - (wasUnread ? 1 : 0));
    setUnreadStoreCount(next);
    return next;
  });
}

export function prependNotification(
  queryClient: ReturnType<typeof useQueryClient>,
  notification: NotificationItem
) {
  let unreadDelta = notification.is_read ? 0 : 1;

  for (const unreadOnly of [false, true]) {
    queryClient.setQueryData<InfiniteData<NotificationListPayload & { page: number }> | undefined>(
      queryKeys.infiniteNotifications(unreadOnly),
      (current) => {
        if (!current) {
          return {
            pages: [
              {
                page: 1,
                total: notification.is_read ? 0 : 1,
                items: unreadOnly && notification.is_read ? [] : [notification],
              },
            ],
            pageParams: [1],
          };
        }

        const flat = flattenInfiniteNotifications(current);
        const existing = flat.items.find((item) => item.id === notification.id);
        if (existing) {
          if (existing.is_read === notification.is_read) {
            unreadDelta = 0;
          } else if (existing.is_read && !notification.is_read) {
            unreadDelta = 1;
          } else {
            unreadDelta = -1;
          }
        }

        const deduped = [
          notification,
          ...flat.items.filter((item) => item.id !== notification.id),
        ];
        const filtered = unreadOnly ? deduped.filter((item) => !item.is_read) : deduped;
        const pages = [...current.pages];
        pages[0] = {
          ...pages[0],
          items: filtered,
          total: unreadOnly ? filtered.length : existing ? flat.total : flat.total + 1,
        };

        return {
          ...current,
          pages,
        };
      }
    );
  }

  queryClient.setQueryData<number | undefined>(queryKeys.notificationBadge, (current) => {
    if (typeof current !== 'number') {
      const next = Math.max(0, unreadDelta);
      setUnreadStoreCount(next);
      return next;
    }
    const next = Math.max(0, current + unreadDelta);
    setUnreadStoreCount(next);
    return next;
  });
}
