'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  addParticipant,
  clearConversation,
  createConversation,
  getConversation,
  listConversations,
  listParticipants,
  removeParticipant,
} from '@/services/conversation-service';
import { ensureConversationKey } from '@/lib/crypto-storage';
import { queryKeys } from '@/queries/query-keys';
import type { CreateConversationRequest } from '@/types';

export function useConversationsQuery() {
  return useQuery({
    queryKey: queryKeys.conversations,
    queryFn: () => listConversations(),
  });
}

export const useConversations = useConversationsQuery;

export function useConversationQuery(conversationId?: string | null) {
  return useQuery({
    queryKey: conversationId ? queryKeys.conversation(conversationId) : ['conversations', 'empty'],
    queryFn: () => getConversation(conversationId as string),
    enabled: Boolean(conversationId),
  });
}

export function useConversation(conversationId?: string | null) {
  return useConversationQuery(conversationId);
}

export function useParticipantsQuery(conversationId?: string | null) {
  return useQuery({
    queryKey: conversationId ? [...queryKeys.conversation(conversationId), 'participants'] : ['conversations', 'participants'],
    queryFn: () => listParticipants(conversationId as string),
    enabled: Boolean(conversationId),
  });
}

export function useConversationParticipants(conversationId?: string | null) {
  return useParticipantsQuery(conversationId);
}

export function useCreateConversationMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateConversationRequest) => {
      const conversation = await createConversation(input);

      try {
        await ensureConversationKey(conversation.id);
      } catch {
        return conversation;
      }

      return conversation;
    },
    onSuccess: (conversation) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations });
      queryClient.setQueryData(queryKeys.conversation(conversation.id), conversation);
    },
  });
}

export const useCreateConversation = useCreateConversationMutation;

export function useGetOrCreateDM() {
  return useMutation({
    mutationFn: async ({ targetUserId }: { currentUserId: string; targetUserId: string }) =>
      createConversation({ type: 'DM', participant_ids: [targetUserId] }),
  });
}

export function useAddParticipantMutation(conversationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => addParticipant(conversationId, { user_id: userId }),
    onSuccess: (conversation) => {
      queryClient.setQueryData(queryKeys.conversation(conversation.id), conversation);
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations });
    },
  });
}

export function useRemoveParticipantMutation(conversationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => removeParticipant(conversationId, userId),
    onSuccess: (conversation) => {
      queryClient.setQueryData(queryKeys.conversation(conversation.id), conversation);
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations });
    },
  });
}

export function useClearConversationMutation(conversationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => clearConversation(conversationId),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: queryKeys.messages(conversationId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations });
    },
  });
}
