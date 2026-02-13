import { apiClient } from './api-client';
import {
  ApiResponse,
  Conversation,
  Participant,
  ConversationSequence,
  CreateConversationRequest,
} from '@/types';

export const conversationService = {
  create: async (data: CreateConversationRequest): Promise<ApiResponse<Conversation>> => {
    return apiClient.post('/v1/conversations', data);
  },

  list: async (page = 1, limit = 20): Promise<ApiResponse<{ conversations: Conversation[]; total: number }>> => {
    return apiClient.get('/v1/conversations', { params: { page, limit } });
  },

  getById: async (id: string): Promise<ApiResponse<Conversation>> => {
    return apiClient.get(`/v1/conversations/${id}`);
  },

  update: async (id: string, data: Partial<Conversation>): Promise<ApiResponse<Conversation>> => {
    return apiClient.put(`/v1/conversations/${id}`, data);
  },

  delete: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.delete(`/v1/conversations/${id}`);
  },

  getDirect: async (userId1: string, userId2: string): Promise<ApiResponse<Conversation>> => {
    return apiClient.get('/v1/conversations/direct', { params: { user_id_1: userId1, user_id_2: userId2 } });
  },

  search: async (query: string): Promise<ApiResponse<{ conversations: Conversation[] }>> => {
    return apiClient.get('/v1/conversations/search', { params: { query } });
  },

  getByType: async (type: 'DM' | 'GROUP'): Promise<ApiResponse<{ conversations: Conversation[] }>> => {
    return apiClient.get('/v1/conversations/type', { params: { type } });
  },

  getByInviteLink: async (link: string): Promise<ApiResponse<Conversation>> => {
    return apiClient.get('/v1/conversations/invite', { params: { link } });
  },

  regenerateInviteLink: async (id: string): Promise<ApiResponse<{ invite_link: string }>> => {
    return apiClient.post(`/v1/conversations/${id}/invite`);
  },

  // Participants
  addParticipant: async (conversationId: string, userId: string, role?: string): Promise<ApiResponse<void>> => {
    return apiClient.post(`/v1/conversations/${conversationId}/participants`, { user_id: userId, role });
  },

  removeParticipant: async (conversationId: string, userId: string): Promise<ApiResponse<void>> => {
    return apiClient.delete(`/v1/conversations/${conversationId}/participants/${userId}`);
  },

  listParticipants: async (conversationId: string): Promise<ApiResponse<{ participants: Participant[] }>> => {
    return apiClient.get(`/v1/conversations/${conversationId}/participants`);
  },

  updateParticipantRole: async (conversationId: string, userId: string, role: string): Promise<ApiResponse<void>> => {
    return apiClient.put(`/v1/conversations/${conversationId}/participants/${userId}/role`, { role });
  },

  // Actions
  mute: async (conversationId: string, until: string): Promise<ApiResponse<void>> => {
    return apiClient.post(`/v1/conversations/${conversationId}/mute`, { until });
  },

  unmute: async (conversationId: string): Promise<ApiResponse<void>> => {
    return apiClient.post(`/v1/conversations/${conversationId}/unmute`);
  },

  pin: async (conversationId: string): Promise<ApiResponse<void>> => {
    return apiClient.post(`/v1/conversations/${conversationId}/pin`);
  },

  unpin: async (conversationId: string): Promise<ApiResponse<void>> => {
    return apiClient.post(`/v1/conversations/${conversationId}/unpin`);
  },

  archive: async (conversationId: string): Promise<ApiResponse<void>> => {
    return apiClient.post(`/v1/conversations/${conversationId}/archive`);
  },

  unarchive: async (conversationId: string): Promise<ApiResponse<void>> => {
    return apiClient.post(`/v1/conversations/${conversationId}/unarchive`);
  },

  // Sequence
  updateLastReadSequence: async (conversationId: string, seqId: number): Promise<ApiResponse<void>> => {
    return apiClient.post(`/v1/conversations/${conversationId}/read-sequence`, { seq_id: seqId });
  },

  getSequence: async (conversationId: string): Promise<ApiResponse<ConversationSequence>> => {
    return apiClient.get(`/v1/conversations/${conversationId}/sequence`);
  },

  incrementSequence: async (conversationId: string): Promise<ApiResponse<ConversationSequence>> => {
    return apiClient.post(`/v1/conversations/${conversationId}/sequence`);
  },
};
