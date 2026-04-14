'use client';

import { create } from 'zustand';
import type { CommandResult } from '@/types';

const GLOBAL_COMMAND_SCOPE = '__global__';

interface CommandState {
  byConversation: Record<string, { lastUndone: CommandResult | null; lastRedone: CommandResult | null }>;
  setLastUndone: (command: CommandResult) => void;
  setLastRedone: (command: CommandResult) => void;
  clearConversation: (conversationId?: string | null) => void;
  clear: () => void;
}

export const useCommandStore = create<CommandState>((set) => ({
  byConversation: {},
  setLastUndone: (command) =>
    set((state) => {
      const key = command.conversation_id ?? GLOBAL_COMMAND_SCOPE;
      const current = state.byConversation[key] ?? { lastUndone: null, lastRedone: null };
      return {
        byConversation: {
          ...state.byConversation,
          [key]: {
            ...current,
            lastUndone: command,
            lastRedone: null,
          },
        },
      };
    }),
  setLastRedone: (command) =>
    set((state) => {
      const key = command.conversation_id ?? GLOBAL_COMMAND_SCOPE;
      const current = state.byConversation[key] ?? { lastUndone: null, lastRedone: null };
      return {
        byConversation: {
          ...state.byConversation,
          [key]: {
            ...current,
            lastUndone: null,
            lastRedone: command,
          },
        },
      };
    }),
  clearConversation: (conversationId) =>
    set((state) => {
      const key = conversationId ?? GLOBAL_COMMAND_SCOPE;
      if (!state.byConversation[key]) {
        return state;
      }
      const next = { ...state.byConversation };
      delete next[key];
      return { byConversation: next };
    }),
  clear: () => set({ byConversation: {} }),
}));
