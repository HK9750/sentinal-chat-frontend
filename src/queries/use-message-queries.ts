import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { messageService, MessageSearchResult } from '@/services/message-service';
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
 * Fetch messages with infinite scrolling support
 * Loads older messages as user scrolls up
 */
export function useInfiniteMessages(conversationId: string) {
  return useInfiniteQuery({
    queryKey: ['conversations', conversationId, 'messages', 'infinite'],
    queryFn: async ({ pageParam }) => {
      const response = await messageService.list(
        conversationId,
        pageParam as number | undefined,
        MESSAGES_PER_PAGE
      );
      if (!response.success) {
        throw new Error(response.error);
      }
      return response.data?.messages || [];
    },
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (lastPage) => {
      // Get the earliest message's sequence number for pagination
      if (lastPage.length < MESSAGES_PER_PAGE) {
        return undefined; // No more pages
      }
      const earliestMessage = lastPage[0];
      return earliestMessage?.sequence_number;
    },
    enabled: !!conversationId,
    staleTime: 10_000,
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

/**
 * Search messages within a specific conversation
 */
export function useSearchMessages(conversationId: string, query: string) {
  return useQuery({
    queryKey: ['conversations', conversationId, 'messages', 'search', query],
    queryFn: async () => {
      const response = await messageService.search(conversationId, query);
      if (!response.success) {
        throw new Error(response.error);
      }
      return response.data?.results || [];
    },
    enabled: !!conversationId && query.length >= 2,
    staleTime: 30_000,
  });
}

/**
 * Global message search across all conversations
 */
export function useSearchMessagesGlobal(query: string) {
  return useQuery({
    queryKey: ['messages', 'search', 'global', query],
    queryFn: async () => {
      const response = await messageService.searchGlobal(query);
      if (!response.success) {
        throw new Error(response.error);
      }
      return response.data?.results || [];
    },
    enabled: query.length >= 2,
    staleTime: 30_000,
  });
}
