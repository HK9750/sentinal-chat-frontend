'use client';

import { create } from 'zustand';

interface ChatState {
  typingByConversation: Record<string, Record<string, number>>;
  markTyping: (conversationId: string, userId: string, active: boolean) => void;
  pruneTyping: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  typingByConversation: {},
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
}));
