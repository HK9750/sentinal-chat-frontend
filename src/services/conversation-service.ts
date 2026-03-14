import { apiClient, unwrapData } from '@/services/api-client';
import { API_ROUTES, CONVERSATIONS_PER_PAGE } from '@/lib/constants';
import type {
  AddParticipantRequest,
  Conversation,
  ConversationClearPayload,
  ConversationListPayload,
  ConversationParticipantsPayload,
  CreateConversationRequest,
} from '@/types';

export async function listConversations(page = 1, limit = CONVERSATIONS_PER_PAGE): Promise<ConversationListPayload> {
  return unwrapData<ConversationListPayload>(
    apiClient.get(API_ROUTES.conversations.list, { params: { page, limit } })
  );
}

export async function getConversation(conversationId: string): Promise<Conversation> {
  return unwrapData<Conversation>(apiClient.get(API_ROUTES.conversations.detail(conversationId)));
}

export async function createConversation(input: CreateConversationRequest): Promise<Conversation> {
  return unwrapData<Conversation>(apiClient.post(API_ROUTES.conversations.create, input));
}

export async function addParticipant(conversationId: string, input: AddParticipantRequest): Promise<Conversation> {
  return unwrapData<Conversation>(apiClient.post(API_ROUTES.conversations.participants(conversationId), input));
}

export async function removeParticipant(conversationId: string, userId: string): Promise<Conversation> {
  return unwrapData<Conversation>(apiClient.delete(API_ROUTES.conversations.removeParticipant(conversationId, userId)));
}

export async function listParticipants(conversationId: string): Promise<ConversationParticipantsPayload> {
  return unwrapData<ConversationParticipantsPayload>(apiClient.get(API_ROUTES.conversations.participants(conversationId)));
}

export async function clearConversation(conversationId: string): Promise<ConversationClearPayload> {
  return unwrapData<ConversationClearPayload>(apiClient.post(API_ROUTES.conversations.clear(conversationId)));
}
