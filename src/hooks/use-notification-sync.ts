'use client';

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  setNotificationBadgeCount,
  syncNotificationSnapshot,
} from '@/queries/use-notification-queries';
import { queryKeys } from '@/queries/query-keys';
import { useAuthStore } from '@/stores/auth-store';
import { useNotificationStore } from '@/stores/notification-store';

const SYNC_THROTTLE_MS = 1500;

export function useNotificationSync() {
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((state) => state.status === 'authenticated');
  const lastSyncedAt = useNotificationStore((state) => state.lastSyncedAt);
  const setLastSyncedAt = useNotificationStore((state) => state.setLastSyncedAt);
  const inFlightRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    let cancelled = false;

    const sync = async () => {
      if (inFlightRef.current) {
        return;
      }

      const now = Date.now();
      if (now - lastSyncedAt < SYNC_THROTTLE_MS) {
        return;
      }

      inFlightRef.current = true;
      try {
        const { unread } = await syncNotificationSnapshot(queryClient, 50);

        if (cancelled) {
          return;
        }

        queryClient.invalidateQueries({ queryKey: queryKeys.notificationSettings });

        setNotificationBadgeCount(queryClient, unread.total);
        setLastSyncedAt(Date.now());
      } catch {
        // Best effort sync only.
      } finally {
        inFlightRef.current = false;
      }
    };

    const onFocus = () => {
      void sync();
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        void sync();
      }
    };

    void sync();
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelled = true;
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [isAuthenticated, lastSyncedAt, queryClient, setLastSyncedAt]);
}
