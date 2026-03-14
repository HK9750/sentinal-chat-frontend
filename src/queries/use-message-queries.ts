'use client';

import { useQuery } from '@tanstack/react-query';
import { getConversationMessages, getMessage } from '@/services/message-service';
import { queryKeys } from '@/queries/query-keys';

export const useMessages = useMessagesQuery;
export const useMessage = useMessageQuery;

export function useSendMessage() {
  return {
    mutateAsync: async () => undefined,
    isPending: false,
  };
}

export function useSearchMessages(conversationId: string, query: string) {
  return useQuery({
    queryKey: ['messages', conversationId, 'search', query],
    queryFn: async () => [],
    enabled: query.trim().length >= 2,
    initialData: [],
  });
}

export function useMessagesQuery(conversationId?: string | null) {
  return useQuery({
    queryKey: conversationId ? queryKeys.messages(conversationId) : ['messages', 'empty'],
    queryFn: () => getConversationMessages(conversationId as string),
    enabled: Boolean(conversationId),
  });
}

export function useMessageQuery(messageId?: string | null) {
  return useQuery({
    queryKey: messageId ? ['messages', messageId] : ['messages', 'detail-empty'],
    queryFn: () => getMessage(messageId as string),
    enabled: Boolean(messageId),
  });
}
