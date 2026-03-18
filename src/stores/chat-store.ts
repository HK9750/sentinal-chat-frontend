'use client';

import { create } from 'zustand';

interface ChatState {
  selectedConversationId: string | null;
  drafts: Record<string, string>;
  typingByConversation: Record<string, Record<string, number>>;
  lastUndoneCommandByConversation: Record<string, string>;
  setSelectedConversationId: (conversationId: string | null) => void;
  setDraft: (conversationId: string, draft: string) => void;
  clearDraft: (conversationId: string) => void;
  markTyping: (conversationId: string, userId: string, active: boolean) => void;
  pruneTyping: () => void;
  setLastUndoneCommand: (conversationId: string, commandId: string) => void;
  clearLastUndoneCommand: (conversationId: string) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  selectedConversationId: null,
  drafts: {},
  typingByConversation: {},
  lastUndoneCommandByConversation: {},
  setSelectedConversationId: (selectedConversationId) => set({ selectedConversationId }),
  setDraft: (conversationId, draft) =>
    set((state) => ({
      drafts: {
        ...state.drafts,
        [conversationId]: draft,
      },
    })),
  clearDraft: (conversationId) =>
    set((state) => {
      const nextDrafts = { ...state.drafts };
      delete nextDrafts[conversationId];
      return { drafts: nextDrafts };
    }),
  markTyping: (conversationId, userId, active) =>
    set((state) => {
      const currentConversation = { ...(state.typingByConversation[conversationId] ?? {}) };

      if (active) {
        currentConversation[userId] = Date.now() + 4_000;
      } else {
        delete currentConversation[userId];
      }

      return {
        typingByConversation: {
          ...state.typingByConversation,
          [conversationId]: currentConversation,
        },
      };
    }),
  pruneTyping: () =>
    set((state) => {
      const now = Date.now();
      const nextTyping: ChatState['typingByConversation'] = {};

      for (const [conversationId, users] of Object.entries(state.typingByConversation)) {
        const activeUsers = Object.fromEntries(
          Object.entries(users).filter(([, expiresAt]) => expiresAt > now)
        );

        if (Object.keys(activeUsers).length > 0) {
          nextTyping[conversationId] = activeUsers;
        }
      }

      return { typingByConversation: nextTyping };
    }),
  setLastUndoneCommand: (conversationId, commandId) =>
    set((state) => ({
      lastUndoneCommandByConversation: {
        ...state.lastUndoneCommandByConversation,
        [conversationId]: commandId,
      },
    })),
  clearLastUndoneCommand: (conversationId) =>
    set((state) => {
      const next = { ...state.lastUndoneCommandByConversation };
      delete next[conversationId];
      return { lastUndoneCommandByConversation: next };
    }),
}));
