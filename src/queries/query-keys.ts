export const queryKeys = {
  sessionsPayload: ['auth', 'sessions', 'payload'] as const,
  sessionsItems: ['auth', 'sessions', 'items'] as const,
  userPreferences: ['user', 'preferences'] as const,
  contacts: ['users', 'contacts'] as const,
  userSearch: (query: string) => ['users', 'search', query] as const,
  conversations: ['conversations'] as const,
  conversation: (conversationId: string) => ['conversations', conversationId] as const,
  conversationCalls: (conversationId: string) => ['conversations', conversationId, 'calls'] as const,
  messages: (conversationId: string) => ['conversations', conversationId, 'messages'] as const,
  notifications: (unreadOnly: boolean) => ['notifications', { unreadOnly }] as const,
  infiniteNotifications: (unreadOnly: boolean) =>
    ['notifications', 'infinite', { unreadOnly }] as const,
  notificationSettings: ['notifications', 'settings'] as const,
  notificationBadge: ['notifications', 'badge'] as const,
  userProfile: ['users', 'me'] as const,
  profileMetrics: ['profile', 'metrics'] as const,
};
