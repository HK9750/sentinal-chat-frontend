export const queryKeys = {
  sessions: ['auth', 'sessions'] as const,
  contacts: ['users', 'contacts'] as const,
  userSearch: (query: string) => ['users', 'search', query] as const,
  conversations: ['conversations'] as const,
  conversation: (conversationId: string) => ['conversations', conversationId] as const,
  messages: (conversationId: string) => ['conversations', conversationId, 'messages'] as const,
  profileMetrics: ['profile', 'metrics'] as const,
  broadcasts: ['broadcasts'] as const,
  broadcast: (broadcastId: string) => ['broadcasts', broadcastId] as const,
};
