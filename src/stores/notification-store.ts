'use client';

import { create } from 'zustand';

interface NotificationStoreState {
  unreadCount: number;
  panelOpen: boolean;
  toastsEnabled: boolean;
  mutedConversations: string[];
  setUnreadCount: (count: number) => void;
  incrementUnread: () => void;
  decrementUnread: () => void;
  setPanelOpen: (open: boolean) => void;
  togglePanel: () => void;
  setToastsEnabled: (enabled: boolean) => void;
  setMutedConversations: (conversationIds: string[]) => void;
}

export const useNotificationStore = create<NotificationStoreState>((set) => ({
  unreadCount: 0,
  panelOpen: false,
  toastsEnabled: true,
  mutedConversations: [],
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
}));
