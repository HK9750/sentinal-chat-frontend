import { apiClient } from './api-client';
import {
  ApiResponse,
  Message,
  SendMessageRequest,
} from '@/types';

export const messageService = {
  send: async (data: SendMessageRequest): Promise<ApiResponse<Message>> => {
    return apiClient.post('/v1/messages', data);
  },

  list: async (conversationId: string, beforeSeq?: number, limit = 50): Promise<ApiResponse<{ messages: Message[] }>> => {
    return apiClient.get('/v1/messages', {
      params: { conversation_id: conversationId, before_seq: beforeSeq, limit },
    });
  },

  getById: async (id: string): Promise<ApiResponse<Message>> => {
    return apiClient.get(`/v1/messages/${id}`);
  },

  update: async (id: string, ciphertext: string): Promise<ApiResponse<Message>> => {
    return apiClient.put(`/v1/messages/${id}`, { ciphertext });
  },

  delete: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.delete(`/v1/messages/${id}`);
  },

  hardDelete: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.delete(`/v1/messages/${id}/hard`);
  },

  markRead: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.post(`/v1/messages/${id}/read`);
  },

  markDelivered: async (id: string): Promise<ApiResponse<void>> => {
    return apiClient.post(`/v1/messages/${id}/delivered`);
  },
};
