import { apiClient } from './api-client';
import { ApiResponse, Broadcast, BroadcastRecipient } from '@/types';

export interface CreateBroadcastRequest {
  name: string;
  description?: string;
  recipients?: string[];
}

export interface UpdateBroadcastRequest {
  name?: string;
  description?: string;
}

export interface AddRecipientRequest {
  user_id: string;
}

export interface BulkRecipientsRequest {
  user_ids: string[];
}

export const broadcastService = {
  create: async (data: CreateBroadcastRequest): Promise<ApiResponse<Broadcast>> => {
    return apiClient.post('/v1/broadcasts', data);
  },

  getById: async (broadcastId: string): Promise<ApiResponse<Broadcast>> => {
    return apiClient.get(`/v1/broadcasts/${broadcastId}`);
  },

  update: async (
    broadcastId: string,
    data: UpdateBroadcastRequest
  ): Promise<ApiResponse<Broadcast>> => {
    return apiClient.put(`/v1/broadcasts/${broadcastId}`, data);
  },

  delete: async (broadcastId: string): Promise<ApiResponse<void>> => {
    return apiClient.delete(`/v1/broadcasts/${broadcastId}`);
  },

  list: async (ownerId: string): Promise<ApiResponse<{ broadcasts: Broadcast[] }>> => {
    return apiClient.get('/v1/broadcasts', { params: { owner_id: ownerId } });
  },

  search: async (ownerId: string, query: string): Promise<ApiResponse<{ broadcasts: Broadcast[] }>> => {
    return apiClient.get('/v1/broadcasts/search', { params: { owner_id: ownerId, query } });
  },

  addRecipient: async (
    broadcastId: string,
    data: AddRecipientRequest
  ): Promise<ApiResponse<void>> => {
    return apiClient.post(`/v1/broadcasts/${broadcastId}/recipients`, data);
  },

  removeRecipient: async (
    broadcastId: string,
    userId: string
  ): Promise<ApiResponse<void>> => {
    return apiClient.delete(`/v1/broadcasts/${broadcastId}/recipients/${userId}`);
  },

  listRecipients: async (
    broadcastId: string
  ): Promise<ApiResponse<{ recipients: BroadcastRecipient[] }>> => {
    return apiClient.get(`/v1/broadcasts/${broadcastId}/recipients`);
  },

  getRecipientCount: async (
    broadcastId: string
  ): Promise<ApiResponse<{ count: number }>> => {
    return apiClient.get(`/v1/broadcasts/${broadcastId}/recipients/count`);
  },

  checkRecipient: async (
    broadcastId: string,
    userId: string
  ): Promise<ApiResponse<{ is_recipient: boolean }>> => {
    return apiClient.get(`/v1/broadcasts/${broadcastId}/recipients/${userId}`);
  },

  bulkAddRecipients: async (
    broadcastId: string,
    data: BulkRecipientsRequest
  ): Promise<ApiResponse<{ added: number }>> => {
    return apiClient.post(`/v1/broadcasts/${broadcastId}/recipients/bulk`, data);
  },

  bulkRemoveRecipients: async (
    broadcastId: string,
    data: BulkRecipientsRequest
  ): Promise<ApiResponse<{ removed: number }>> => {
    return apiClient.delete(`/v1/broadcasts/${broadcastId}/recipients/bulk`, {
      data,
    });
  },
};
