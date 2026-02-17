import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { messageService } from '@/services/message-service';
import { conversationService } from '@/services/conversation-service';
import { SendMessageRequest, Message } from '@/types';

const MESSAGES_PER_PAGE = 50;

/**
 * Fetch messages for a conversation
 * TanStack Query is the single source of truth
 */
export function useMessages(conversationId: string) {
  return useQuery({
    queryKey: ['conversations', conversationId, 'messages'],
    queryFn: async () => {
      const response = await messageService.list(conversationId, undefined, MESSAGES_PER_PAGE);
      if (!response.success) {
        throw new Error(response.error);
      }
      return response.data?.messages || [];
    },
    enabled: !!conversationId,
    staleTime: 10_000, // Messages are frequently updated
  });
}

/**
 * Send a message with optimistic update
 */
export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: SendMessageRequest) => {
      const response = await messageService.send(data);
      if (!response.success) {
        throw new Error(response.error);
      }
      return response.data;
    },
    onSuccess: (newMessage, variables) => {
      if (newMessage) {
        // Optimistically add message to the cache
        queryClient.setQueryData<Message[]>(
          ['conversations', variables.conversation_id, 'messages'],
          (old = []) => [...old, newMessage]
        );
        // Invalidate conversation list to update last message
        queryClient.invalidateQueries({
          queryKey: ['conversations', 'list'],
        });
      }
    },
  });
}

/**
 * Mark a message as read
 */
export function useMarkMessageRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (messageId: string) => {
      const response = await messageService.markRead(messageId);
      if (!response.success) {
        throw new Error(response.error);
      }
      return response.data;
    },
    onSuccess: () => {
      // Invalidate to update unread counts
      queryClient.invalidateQueries({ queryKey: ['conversations', 'list'] });
    },
  });
}

/**
 * Delete a message with optimistic update
 */
export function useDeleteMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      messageId,
      conversationId,
      hard = false,
    }: {
      messageId: string;
      conversationId: string;
      hard?: boolean;
    }) => {
      const response = hard
        ? await messageService.hardDelete(messageId)
        : await messageService.delete(messageId);
      if (!response.success) {
        throw new Error(response.error);
      }
      return response.data;
    },
    onMutate: async ({ messageId, conversationId }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: ['conversations', conversationId, 'messages'],
      });

      // Snapshot the previous value
      const previousMessages = queryClient.getQueryData<Message[]>([
        'conversations',
        conversationId,
        'messages',
      ]);

      // Optimistically remove the message
      queryClient.setQueryData<Message[]>(
        ['conversations', conversationId, 'messages'],
        (old = []) => old.filter((msg) => msg.id !== messageId)
      );

      return { previousMessages };
    },
    onError: (_, { conversationId }, context) => {
      // Rollback on error
      if (context?.previousMessages) {
        queryClient.setQueryData(
          ['conversations', conversationId, 'messages'],
          context.previousMessages
        );
      }
    },
  });
}

/**
 * Update last read sequence for a conversation
 */
export function useUpdateLastReadSequence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      conversationId,
      seqId,
    }: {
      conversationId: string;
      seqId: number;
    }) => {
      const response = await conversationService.updateLastReadSequence(conversationId, seqId);
      if (!response.success) {
        throw new Error(response.error);
      }
      return response.data;
    },
    onSuccess: (_, { conversationId }) => {
      queryClient.invalidateQueries({ queryKey: ['conversations', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations', 'list'] });
    },
  });
}
