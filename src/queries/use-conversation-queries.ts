import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { conversationService } from '@/services/conversation-service';
import { CreateConversationRequest, Conversation, Participant } from '@/types';

const CONVERSATIONS_PER_PAGE = 20;

/**
 * Fetch all conversations for the current user
 * TanStack Query is the single source of truth - no Zustand sync needed
 */
export function useConversations() {
  return useQuery({
    queryKey: ['conversations', 'list'],
    queryFn: async () => {
      const response = await conversationService.list(1, CONVERSATIONS_PER_PAGE);
      if (!response.success) {
        throw new Error(response.error);
      }
      return response.data?.conversations || [];
    },
    staleTime: 30_000, // Consider data fresh for 30 seconds
  });
}

/**
 * Fetch a single conversation by ID
 */
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
    staleTime: 30_000,
  });
}

/**
 * Create a new conversation with optimistic update
 */
export function useCreateConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateConversationRequest) => {
      const response = await conversationService.create(data);
      if (!response.success) {
        throw new Error(response.error);
      }
      return response.data;
    },
    onSuccess: (newConversation) => {
      if (newConversation) {
        // Optimistically add to the list cache
        queryClient.setQueryData<Conversation[]>(
          ['conversations', 'list'],
          (old = []) => [newConversation, ...old]
        );
      }
    },
  });
}

/**
 * Fetch participants for a conversation
 */
export function useConversationParticipants(conversationId: string) {
  return useQuery({
    queryKey: ['conversations', conversationId, 'participants'],
    queryFn: async () => {
      const response = await conversationService.listParticipants(conversationId);
      if (!response.success) {
        throw new Error(response.error);
      }
      return response.data?.participants || [];
    },
    enabled: !!conversationId,
    staleTime: 60_000, // Participants change less frequently
  });
}

/**
 * Add a participant to a conversation
 */
export function useAddParticipant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      conversationId,
      userId,
      role,
    }: {
      conversationId: string;
      userId: string;
      role?: string;
    }) => {
      const response = await conversationService.addParticipant(conversationId, userId, role);
      if (!response.success) {
        throw new Error(response.error);
      }
      return response.data;
    },
    onSuccess: (_, { conversationId }) => {
      queryClient.invalidateQueries({
        queryKey: ['conversations', conversationId, 'participants'],
      });
    },
  });
}

/**
 * Remove a participant from a conversation
 */
export function useRemoveParticipant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      conversationId,
      userId,
    }: {
      conversationId: string;
      userId: string;
    }) => {
      const response = await conversationService.removeParticipant(conversationId, userId);
      if (!response.success) {
        throw new Error(response.error);
      }
      return response.data;
    },
    onSuccess: (_, { conversationId }) => {
      queryClient.invalidateQueries({
        queryKey: ['conversations', conversationId, 'participants'],
      });
    },
  });
}

/**
 * Mute a conversation
 */
export function useMuteConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      conversationId,
      until,
    }: {
      conversationId: string;
      until: string;
    }) => {
      const response = await conversationService.mute(conversationId, until);
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
 * Unmute a conversation
 */
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
      queryClient.invalidateQueries({ queryKey: ['conversations', 'list'] });
    },
  });
}

/**
 * Archive a conversation
 */
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
    onSuccess: (_, conversationId) => {
      // Optimistically remove from list
      queryClient.setQueryData<Conversation[]>(
        ['conversations', 'list'],
        (old = []) => old.filter((c) => c.id !== conversationId)
      );
    },
  });
}

/**
 * Unarchive a conversation
 */
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

/**
 * Get or create a direct message conversation with a user
 * First tries to find existing DM, then creates one if not found
 */
export function useGetOrCreateDM() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      currentUserId,
      targetUserId,
    }: {
      currentUserId: string;
      targetUserId: string;
    }) => {
      // Validate user IDs before making API call
      if (!currentUserId || currentUserId.trim() === '') {
        throw new Error('Current user ID is required to create a DM conversation');
      }
      if (!targetUserId || targetUserId.trim() === '') {
        throw new Error('Target user ID is required to create a DM conversation');
      }

      // First try to get existing DM
      try {
        const existingResponse = await conversationService.getDirect(
          currentUserId,
          targetUserId
        );

        // If existing DM found, return it
        if (existingResponse.success && existingResponse.data) {
          return existingResponse.data;
        }
      } catch {
        // DM doesn't exist - this is expected, continue to create one
      }

      // No existing DM found - create a new one
      const createResponse = await conversationService.create({
        type: 'DM',
        participants: [targetUserId],
      });

      if (!createResponse.success) {
        throw new Error(createResponse.error || 'Failed to create conversation');
      }

      return createResponse.data;
    },
    onSuccess: (conversation) => {
      if (conversation) {
        // Add to conversations list cache
        queryClient.setQueryData<Conversation[]>(
          ['conversations', 'list'],
          (old = []) => {
            // Check if already exists
            if (old.some((c) => c.id === conversation.id)) {
              return old;
            }
            return [conversation, ...old];
          }
        );
      }
    },
  });
}

/**
 * Search conversations on the server
 */
export function useSearchConversations(query: string) {
  return useQuery({
    queryKey: ['conversations', 'search', query],
    queryFn: async () => {
      const response = await conversationService.search(query);
      if (!response.success) {
        throw new Error(response.error);
      }
      return response.data?.conversations || [];
    },
    enabled: query.length >= 2,
    staleTime: 30_000,
  });
}
