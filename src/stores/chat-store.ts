import { create } from 'zustand';
import { Conversation, Message, Participant } from '@/types';

interface ChatState {
  // Conversations
  conversations: Conversation[];
  selectedConversationId: string | null;
  
  // Messages
  messages: Map<string, Message[]>;
  typingUsers: Map<string, string[]>;
  
  // Participants
  participants: Map<string, Participant[]>;
  
  // Actions
  setConversations: (conversations: Conversation[]) => void;
  addConversation: (conversation: Conversation) => void;
  updateConversation: (id: string, updates: Partial<Conversation>) => void;
  removeConversation: (id: string) => void;
  selectConversation: (id: string | null) => void;
  
  setMessages: (conversationId: string, messages: Message[]) => void;
  addMessage: (conversationId: string, message: Message) => void;
  updateMessage: (conversationId: string, messageId: string, updates: Partial<Message>) => void;
  deleteMessage: (conversationId: string, messageId: string) => void;
  
  setTypingUsers: (conversationId: string, userIds: string[]) => void;
  addTypingUser: (conversationId: string, userId: string) => void;
  removeTypingUser: (conversationId: string, userId: string) => void;
  
  setParticipants: (conversationId: string, participants: Participant[]) => void;
  addParticipant: (conversationId: string, participant: Participant) => void;
  removeParticipant: (conversationId: string, userId: string) => void;
  
  // Getters
  getConversationById: (id: string) => Conversation | undefined;
  getMessagesByConversationId: (id: string) => Message[];
  getParticipantsByConversationId: (id: string) => Participant[];
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  selectedConversationId: null,
  messages: new Map(),
  typingUsers: new Map(),
  participants: new Map(),

  setConversations: (conversations) => set({ conversations }),
  
  addConversation: (conversation) => set((state) => ({
    conversations: [conversation, ...state.conversations],
  })),
  
  updateConversation: (id, updates) => set((state) => ({
    conversations: state.conversations.map((conv) =>
      conv.id === id ? { ...conv, ...updates } : conv
    ),
  })),
  
  removeConversation: (id) => set((state) => ({
    conversations: state.conversations.filter((conv) => conv.id !== id),
    selectedConversationId: state.selectedConversationId === id ? null : state.selectedConversationId,
  })),
  
  selectConversation: (id) => set({ selectedConversationId: id }),

  setMessages: (conversationId, messages) => set((state) => {
    const newMessages = new Map(state.messages);
    newMessages.set(conversationId, messages);
    return { messages: newMessages };
  }),
  
  addMessage: (conversationId, message) => set((state) => {
    const newMessages = new Map(state.messages);
    const existing = newMessages.get(conversationId) || [];
    newMessages.set(conversationId, [...existing, message]);
    return { messages: newMessages };
  }),
  
  updateMessage: (conversationId, messageId, updates) => set((state) => {
    const newMessages = new Map(state.messages);
    const existing = newMessages.get(conversationId) || [];
    newMessages.set(
      conversationId,
      existing.map((msg) => (msg.id === messageId ? { ...msg, ...updates } : msg))
    );
    return { messages: newMessages };
  }),
  
  deleteMessage: (conversationId, messageId) => set((state) => {
    const newMessages = new Map(state.messages);
    const existing = newMessages.get(conversationId) || [];
    newMessages.set(
      conversationId,
      existing.filter((msg) => msg.id !== messageId)
    );
    return { messages: newMessages };
  }),

  setTypingUsers: (conversationId, userIds) => set((state) => {
    const newTypingUsers = new Map(state.typingUsers);
    newTypingUsers.set(conversationId, userIds);
    return { typingUsers: newTypingUsers };
  }),
  
  addTypingUser: (conversationId, userId) => set((state) => {
    const newTypingUsers = new Map(state.typingUsers);
    const existing = newTypingUsers.get(conversationId) || [];
    if (!existing.includes(userId)) {
      newTypingUsers.set(conversationId, [...existing, userId]);
    }
    return { typingUsers: newTypingUsers };
  }),
  
  removeTypingUser: (conversationId, userId) => set((state) => {
    const newTypingUsers = new Map(state.typingUsers);
    const existing = newTypingUsers.get(conversationId) || [];
    newTypingUsers.set(conversationId, existing.filter((id) => id !== userId));
    return { typingUsers: newTypingUsers };
  }),

  setParticipants: (conversationId, participants) => set((state) => {
    const newParticipants = new Map(state.participants);
    newParticipants.set(conversationId, participants);
    return { participants: newParticipants };
  }),
  
  addParticipant: (conversationId, participant) => set((state) => {
    const newParticipants = new Map(state.participants);
    const existing = newParticipants.get(conversationId) || [];
    newParticipants.set(conversationId, [...existing, participant]);
    return { participants: newParticipants };
  }),
  
  removeParticipant: (conversationId, userId) => set((state) => {
    const newParticipants = new Map(state.participants);
    const existing = newParticipants.get(conversationId) || [];
    newParticipants.set(conversationId, existing.filter((p) => p.user_id !== userId));
    return { participants: newParticipants };
  }),

  getConversationById: (id) => get().conversations.find((conv) => conv.id === id),
  
  getMessagesByConversationId: (id) => get().messages.get(id) || [],
  
  getParticipantsByConversationId: (id) => get().participants.get(id) || [],
}));
