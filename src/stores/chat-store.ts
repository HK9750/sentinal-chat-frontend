import { create } from 'zustand';

/**
 * Chat Store - Minimal client state only
 * 
 * Per AGENTS.md: Server state (conversations, messages, participants)
 * should live in TanStack Query, NOT in Zustand.
 * 
 * This store only handles:
 * - Typing indicators (real-time WebSocket state)
 * - Selected conversation ID (URL is source of truth, this is for quick access)
 */
interface ChatState {
  // Real-time typing state (not persisted, WebSocket-driven)
  typingUsers: Map<string, string[]>;
  
  // Actions
  setTypingUsers: (conversationId: string, userIds: string[]) => void;
  addTypingUser: (conversationId: string, userId: string) => void;
  removeTypingUser: (conversationId: string, userId: string) => void;
  clearTypingUsers: (conversationId: string) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  typingUsers: new Map(),

  setTypingUsers: (conversationId, userIds) =>
    set((state) => {
      const newTypingUsers = new Map(state.typingUsers);
      newTypingUsers.set(conversationId, userIds);
      return { typingUsers: newTypingUsers };
    }),

  addTypingUser: (conversationId, userId) =>
    set((state) => {
      const newTypingUsers = new Map(state.typingUsers);
      const existing = newTypingUsers.get(conversationId) || [];
      if (!existing.includes(userId)) {
        newTypingUsers.set(conversationId, [...existing, userId]);
      }
      return { typingUsers: newTypingUsers };
    }),

  removeTypingUser: (conversationId, userId) =>
    set((state) => {
      const newTypingUsers = new Map(state.typingUsers);
      const existing = newTypingUsers.get(conversationId) || [];
      newTypingUsers.set(
        conversationId,
        existing.filter((id) => id !== userId)
      );
      return { typingUsers: newTypingUsers };
    }),

  clearTypingUsers: (conversationId) =>
    set((state) => {
      const newTypingUsers = new Map(state.typingUsers);
      newTypingUsers.delete(conversationId);
      return { typingUsers: newTypingUsers };
    }),
}));
