'use client';

import { useMemo } from 'react';
import { useMessages } from '@/queries/use-message-queries';

export function useConversationMessages(conversationId?: string | null) {
  const messagesQuery = useMessages(conversationId);

  const items = useMemo(() => messagesQuery.data ?? [], [messagesQuery.data]);

  return {
    ...messagesQuery,
    items,
  };
}
