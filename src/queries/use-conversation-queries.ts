import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { conversationService } from '@/services/conversation-service';
import { useChatStore } from '@/stores/chat-store';
import { CreateConversationRequest } from '@/types';

const CONVERSATIONS_PER_PAGE = 20;

export function useConversations() {
  const setConversations = useChatStore((state) => state.setConversations);

  return useQuery({
    queryKey: ['conversations', 'list'],
    queryFn: async () => {
      const response = await conversationService.list(1, CONVERSATIONS_PER_PAGE);
      if (!response.success) {
        throw new Error(response.error);
      }
      const conversations = response.data?.conversations || [];
      setConversations(conversations);
      return conversations;
    },
  });
}

export function useConversation(conversationId: string) {
  return useQuery({
    queryKey: ['conversations', conversationId],
    queryFn: async () => {
      const response = await conversationService.getById(conversationId);
      if (!response.success) {
        throw new Error(response.error);
      }
      return response.data;
    },
    enabled: !!conversationId,
  });
}

export function useCreateConversation() {
  const queryClient = useQueryClient();
  const addConversation = useChatStore((state) => state.addConversation);

  return useMutation({
    mutationFn: async (data: CreateConversationRequest) => {
      const response = await conversationService.create(data);
      if (!response.success) {
        throw new Error(response.error);
      }
      return response.data;
    },
    onSuccess: (data) => {
      if (data) {
        addConversation(data);
        queryClient.invalidateQueries({ queryKey: ['conversations', 'list'] });
      }
    },
  });
}

export function useConversationParticipants(conversationId: string) {
  const setParticipants = useChatStore((state) => state.setParticipants);

  return useQuery({
    queryKey: ['conversations', conversationId, 'participants'],
    queryFn: async () => {
      const response = await conversationService.listParticipants(conversationId);
      if (!response.success) {
        throw new Error(response.error);
      }
      const participants = response.data?.participants || [];
      setParticipants(conversationId, participants);
      return participants;
    },
    enabled: !!conversationId,
  });
}

export function useAddParticipant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ conversationId, userId, role }: { conversationId: string; userId: string; role?: string }) => {
      const response = await conversationService.addParticipant(conversationId, userId, role);
      if (!response.success) {
        throw new Error(response.error);
      }
      return response.data;
    },
    onSuccess: (_, { conversationId }) => {
      queryClient.invalidateQueries({ queryKey: ['conversations', conversationId, 'participants'] });
    },
  });
}

export function useRemoveParticipant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ conversationId, userId }: { conversationId: string; userId: string }) => {
      const response = await conversationService.removeParticipant(conversationId, userId);
      if (!response.success) {
        throw new Error(response.error);
      }
      return response.data;
    },
    onSuccess: (_, { conversationId }) => {
      queryClient.invalidateQueries({ queryKey: ['conversations', conversationId, 'participants'] });
    },
  });
}

export function useMuteConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ conversationId, until }: { conversationId: string; until: string }) => {
      const response = await conversationService.mute(conversationId, until);
      if (!response.success) {
        throw new Error(response.error);
      }
      return response.data;
    },
    onSuccess: (_, { conversationId }) => {
      queryClient.invalidateQueries({ queryKey: ['conversations', conversationId] });
    },
  });
}

export function useUnmuteConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (conversationId: string) => {
      const response = await conversationService.unmute(conversationId);
      if (!response.success) {
        throw new Error(response.error);
      }
      return response.data;
    },
    onSuccess: (_, conversationId) => {
      queryClient.invalidateQueries({ queryKey: ['conversations', conversationId] });
    },
  });
}

export function useArchiveConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (conversationId: string) => {
      const response = await conversationService.archive(conversationId);
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

export function useUnarchiveConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (conversationId: string) => {
      const response = await conversationService.unarchive(conversationId);
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
