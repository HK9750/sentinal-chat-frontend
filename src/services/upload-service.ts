import { apiClient } from './api-client';
import { ApiResponse, Upload } from '@/types';

export interface CreateUploadRequest {
  file_name: string;
  file_size: number;
  content_type: string;
  uploader_id: string;
}

export interface UpdateUploadProgressRequest {
  uploaded_bytes: number;
}

export const uploadService = {
  create: async (data: CreateUploadRequest): Promise<ApiResponse<Upload & { upload_url: string }>> => {
    return apiClient.post('/v1/uploads', data);
  },

  getById: async (uploadId: string): Promise<ApiResponse<Upload>> => {
    return apiClient.get(`/v1/uploads/${uploadId}`);
  },

  updateProgress: async (
    uploadId: string,
    data: UpdateUploadProgressRequest
  ): Promise<ApiResponse<Upload>> => {
    return apiClient.post(`/v1/uploads/${uploadId}/progress`, data);
  },

  markComplete: async (uploadId: string): Promise<ApiResponse<Upload>> => {
    return apiClient.post(`/v1/uploads/${uploadId}/complete`);
  },

  markFailed: async (uploadId: string): Promise<ApiResponse<void>> => {
    return apiClient.post(`/v1/uploads/${uploadId}/fail`);
  },

  delete: async (uploadId: string): Promise<ApiResponse<void>> => {
    return apiClient.delete(`/v1/uploads/${uploadId}`);
  },

  list: async (
    uploaderId: string,
    page = 1,
    limit = 20
  ): Promise<ApiResponse<{ uploads: Upload[]; total: number }>> => {
    return apiClient.get('/v1/uploads', {
      params: { uploader_id: uploaderId, page, limit },
    });
  },

  listCompleted: async (uploaderId: string, page = 1, limit = 20): Promise<ApiResponse<{ uploads: Upload[] }>> => {
    return apiClient.get('/v1/uploads/completed', {
      params: { uploader_id: uploaderId, page, limit },
    });
  },

  listInProgress: async (uploaderId: string): Promise<ApiResponse<{ uploads: Upload[] }>> => {
    return apiClient.get('/v1/uploads/in-progress', {
      params: { uploader_id: uploaderId },
    });
  },

  listStale: async (
    olderThanSec: number
  ): Promise<ApiResponse<{ uploads: Upload[] }>> => {
    return apiClient.get('/v1/uploads/stale', {
      params: { older_than_sec: olderThanSec },
    });
  },

  deleteStale: async (olderThanSec: number): Promise<ApiResponse<{ deleted: number }>> => {
    return apiClient.delete('/v1/uploads/stale', {
      params: { older_than_sec: olderThanSec },
    });
  },
};
