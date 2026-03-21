'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getConversationMessages, getMessage } from '@/services/message-service';
import { queryKeys } from '@/queries/query-keys';
import type { Message } from '@/types';

export const useMessages = useMessagesQuery;
export const useMessage = useMessageQuery;

export function useMessagesQuery(conversationId?: string | null) {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: conversationId ? queryKeys.messages(conversationId) : ['messages', 'empty'],
    queryFn: async () => {
      const resolvedConversationId = conversationId as string;
      const fetched = await getConversationMessages(resolvedConversationId);
      const current =
        queryClient.getQueryData<Message[]>(queryKeys.messages(resolvedConversationId)) ?? [];

      const unsynced = current.filter(
        (message) => message.client_status === 'PENDING'
      );

      if (unsynced.length === 0) {
        return fetched;
      }

      const merged = [...fetched];
      for (const localMessage of unsynced) {
        const matched = merged.some(
          (message) =>
            message.id === localMessage.id ||
            (localMessage.client_message_id !== null &&
              localMessage.client_message_id !== undefined &&
              message.client_message_id === localMessage.client_message_id)
        );

        if (!matched) {
          merged.push(localMessage);
        }
      }

      return merged.sort((left, right) => left.seq_id - right.seq_id);
    },
    enabled: Boolean(conversationId),
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });
}

export function useMessageQuery(messageId?: string | null) {
  return useQuery({
    queryKey: messageId ? ['messages', messageId] : ['messages', 'detail-empty'],
    queryFn: () => getMessage(messageId as string),
    enabled: Boolean(messageId),
  });
}
