'use client';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { STORAGE_KEYS } from '@/lib/constants';

interface NotificationStoreState {
  unreadCount: number;
  panelOpen: boolean;
  toastsEnabled: boolean;
  mutedConversations: string[];
  lastSyncedAt: number;
  setUnreadCount: (count: number) => void;
  incrementUnread: () => void;
  decrementUnread: () => void;
  setPanelOpen: (open: boolean) => void;
  togglePanel: () => void;
  setToastsEnabled: (enabled: boolean) => void;
  setMutedConversations: (conversationIds: string[]) => void;
  setLastSyncedAt: (value: number) => void;
}

export const useNotificationStore = create<NotificationStoreState>()(
  persist(
    (set) => ({
      unreadCount: 0,
      panelOpen: false,
      toastsEnabled: true,
      mutedConversations: [],
      lastSyncedAt: 0,
      setUnreadCount: (count) => set({ unreadCount: Math.max(0, count) }),
      incrementUnread: () =>
        set((state) => ({
          unreadCount: state.unreadCount + 1,
        })),
      decrementUnread: () =>
        set((state) => ({
          unreadCount: Math.max(0, state.unreadCount - 1),
        })),
      setPanelOpen: (open) => set({ panelOpen: open }),
      togglePanel: () => set((state) => ({ panelOpen: !state.panelOpen })),
      setToastsEnabled: (enabled) => set({ toastsEnabled: enabled }),
      setMutedConversations: (conversationIds) =>
        set({ mutedConversations: [...new Set(conversationIds)] }),
      setLastSyncedAt: (value) => set({ lastSyncedAt: Math.max(0, value) }),
    }),
    {
      name: `${STORAGE_KEYS.ui}.notifications`,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        toastsEnabled: state.toastsEnabled,
        lastSyncedAt: state.lastSyncedAt,
      }),
    }
  )
);
