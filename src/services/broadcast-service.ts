import { apiClient } from './api-client';
import { ApiResponse, Broadcast, BroadcastRecipient } from '@/types';

// Request DTOs
export interface CreateBroadcastRequest {
  name: string;
  description?: string;
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
  // Broadcast CRUD
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

  // List Broadcasts
  list: async (): Promise<ApiResponse<{ broadcasts: Broadcast[] }>> => {
    return apiClient.get('/v1/broadcasts');
  },

  search: async (query: string): Promise<ApiResponse<{ broadcasts: Broadcast[] }>> => {
    return apiClient.get('/v1/broadcasts/search', { params: { query } });
  },

  // Recipient Management
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

  // Bulk Operations
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
