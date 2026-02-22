import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { messageService, MessageSearchResult } from '@/services/message-service';
import { conversationService } from '@/services/conversation-service';
import { SendMessageRequest, Message } from '@/types';

const MESSAGES_PER_PAGE = 50;

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
    staleTime: 10_000,
  });
}

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
      if (lastPage.length < MESSAGES_PER_PAGE) {
        return undefined;
      }
      const earliestMessage = lastPage[0];
      return earliestMessage?.sequence_number;
    },
    enabled: !!conversationId,
    staleTime: 10_000,
  });
}

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
        queryClient.setQueryData<Message[]>(
          ['conversations', variables.conversation_id, 'messages'],
          (old = []) => [...old, newMessage]
        );
        queryClient.invalidateQueries({
          queryKey: ['conversations', 'list'],
        });
      }
    },
  });
}

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
      queryClient.invalidateQueries({ queryKey: ['conversations', 'list'] });
    },
  });
}

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
      await queryClient.cancelQueries({
        queryKey: ['conversations', conversationId, 'messages'],
      });

      const previousMessages = queryClient.getQueryData<Message[]>([
        'conversations',
        conversationId,
        'messages',
      ]);

      queryClient.setQueryData<Message[]>(
        ['conversations', conversationId, 'messages'],
        (old = []) => old.filter((msg) => msg.id !== messageId)
      );

      return { previousMessages };
    },
    onError: (_, { conversationId }, context) => {
      if (context?.previousMessages) {
        queryClient.setQueryData(
          ['conversations', conversationId, 'messages'],
          context.previousMessages
        );
      }
    },
  });
}

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
