export const queryKeys = {
  sessionsPayload: ['auth', 'sessions', 'payload'] as const,
  sessionsItems: ['auth', 'sessions', 'items'] as const,
  contacts: ['users', 'contacts'] as const,
  userSearch: (query: string) => ['users', 'search', query] as const,
  conversations: ['conversations'] as const,
  conversation: (conversationId: string) => ['conversations', conversationId] as const,
  conversationCalls: (conversationId: string) => ['conversations', conversationId, 'calls'] as const,
  messages: (conversationId: string) => ['conversations', conversationId, 'messages'] as const,
  profileMetrics: ['profile', 'metrics'] as const,
};
