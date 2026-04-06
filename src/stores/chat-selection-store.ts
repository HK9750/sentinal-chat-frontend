'use client';

import { create } from 'zustand';

interface ChatSelectionState {
  conversationId: string | null;
  enabled: boolean;
  selectedMessageIds: string[];
  startSelection: (conversationId: string) => void;
  stopSelection: () => void;
  toggleMessage: (messageId: string) => void;
  clearSelection: () => void;
  pruneMissing: (existingIds: string[]) => void;
}

export const useChatSelectionStore = create<ChatSelectionState>((set, get) => ({
  conversationId: null,
  enabled: false,
  selectedMessageIds: [],
  startSelection: (conversationId) =>
    set((state) => {
      if (state.conversationId !== conversationId) {
        return {
          conversationId,
          enabled: true,
          selectedMessageIds: [],
        };
      }

      return {
        ...state,
        enabled: true,
      };
    }),
  stopSelection: () =>
    set({
      conversationId: null,
      enabled: false,
      selectedMessageIds: [],
    }),
  toggleMessage: (messageId) =>
    set((state) => {
      if (!state.enabled) {
        return state;
      }
      if (state.selectedMessageIds.includes(messageId)) {
        return {
          ...state,
          selectedMessageIds: state.selectedMessageIds.filter((id) => id !== messageId),
        };
      }
      return {
        ...state,
        selectedMessageIds: [...state.selectedMessageIds, messageId],
      };
    }),
  clearSelection: () =>
    set((state) => ({
      ...state,
      selectedMessageIds: [],
    })),
  pruneMissing: (existingIds) => {
    const existing = new Set(existingIds);
    const current = get();
    if (current.selectedMessageIds.length === 0) {
      return;
    }
    set({
      ...current,
      selectedMessageIds: current.selectedMessageIds.filter((id) => existing.has(id)),
    });
  },
}));
