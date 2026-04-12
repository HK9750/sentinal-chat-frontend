'use client';

import { create } from 'zustand';

interface NotificationStoreState {
  unreadCount: number;
  panelOpen: boolean;
  setUnreadCount: (count: number) => void;
  incrementUnread: () => void;
  decrementUnread: () => void;
  setPanelOpen: (open: boolean) => void;
  togglePanel: () => void;
}

export const useNotificationStore = create<NotificationStoreState>((set) => ({
  unreadCount: 0,
  panelOpen: false,
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
}));
