import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { messageService } from '@/services/message-service';
import { useChatStore } from '@/stores/chat-store';
import { SendMessageRequest, Message } from '@/types';

const MESSAGES_PER_PAGE = 50;

export function useMessages(conversationId: string) {
  const setMessages = useChatStore((state) => state.setMessages);
  const addMessage = useChatStore((state) => state.addMessage);

  return useQuery({
    queryKey: ['conversations', conversationId, 'messages'],
    queryFn: async () => {
      const response = await messageService.list(conversationId, undefined, MESSAGES_PER_PAGE);
      if (!response.success) {
        throw new Error(response.error);
      }
      const messages = response.data?.messages || [];
      setMessages(conversationId, messages);
      return messages;
    },
    enabled: !!conversationId,
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();
  const addMessage = useChatStore((state) => state.addMessage);

  return useMutation({
    mutationFn: async (data: SendMessageRequest) => {
      const response = await messageService.send(data);
      if (!response.success) {
        throw new Error(response.error);
      }
      return response.data;
    },
    onSuccess: (data, variables) => {
      if (data) {
        addMessage(variables.conversation_id, data);
        queryClient.invalidateQueries({ 
          queryKey: ['conversations', 'list'] 
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
  const deleteMessage = useChatStore((state) => state.deleteMessage);

  return useMutation({
    mutationFn: async ({ messageId, conversationId, hard = false }: { messageId: string; conversationId: string; hard?: boolean }) => {
      const response = hard 
        ? await messageService.hardDelete(messageId)
        : await messageService.delete(messageId);
      if (!response.success) {
        throw new Error(response.error);
      }
      return response.data;
    },
    onSuccess: (_, { messageId, conversationId }) => {
      deleteMessage(conversationId, messageId);
      queryClient.invalidateQueries({ queryKey: ['conversations', conversationId, 'messages'] });
    },
  });
}

export function useUpdateLastReadSequence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ conversationId, seqId }: { conversationId: string; seqId: number }) => {
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

// Import needed for useUpdateLastReadSequence
import { conversationService } from '@/services/conversation-service';
