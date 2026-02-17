import { apiClient } from './api-client';
import {
  ApiResponse,
  Call,
  CallParticipant,
  CallQualityMetric,
  CallType,
  CallEndReason,
  ParticipantStatus,
} from '@/types';

// Request DTOs
export interface CreateCallRequest {
  conversation_id: string;
  type: CallType;
  initiator_id: string;
}

export interface AddCallParticipantRequest {
  user_id: string;
}

export interface UpdateParticipantStatusRequest {
  status: ParticipantStatus;
}

export interface UpdateParticipantMuteRequest {
  audio_muted: boolean;
  video_muted: boolean;
}

export interface EndCallRequest {
  reason: CallEndReason;
}

export interface RecordQualityMetricRequest {
  call_id: string;
  user_id: string;
  timestamp: string;
  packet_loss: number;
  jitter: number;
  latency: number;
  bitrate: number;
  frame_rate?: number;
  resolution?: string;
  audio_level?: number;
}

export const callService = {
  // Call CRUD
  create: async (data: CreateCallRequest): Promise<ApiResponse<Call>> => {
    return apiClient.post('/v1/calls', data);
  },

  getById: async (callId: string): Promise<ApiResponse<Call>> => {
    return apiClient.get(`/v1/calls/${callId}`);
  },

  list: async (
    conversationId?: string,
    page = 1,
    limit = 20
  ): Promise<ApiResponse<{ calls: Call[]; total: number }>> => {
    return apiClient.get('/v1/calls', {
      params: { conversation_id: conversationId, page, limit },
    });
  },

  listByUser: async (userId: string): Promise<ApiResponse<{ calls: Call[] }>> => {
    return apiClient.get('/v1/calls/user', { params: { user_id: userId } });
  },

  listActive: async (): Promise<ApiResponse<{ calls: Call[] }>> => {
    return apiClient.get('/v1/calls/active');
  },

  listMissed: async (): Promise<ApiResponse<{ calls: Call[] }>> => {
    return apiClient.get('/v1/calls/missed');
  },

  // Call Participants
  addParticipant: async (
    callId: string,
    data: AddCallParticipantRequest
  ): Promise<ApiResponse<void>> => {
    return apiClient.post(`/v1/calls/${callId}/participants`, data);
  },

  removeParticipant: async (callId: string, userId: string): Promise<ApiResponse<void>> => {
    return apiClient.delete(`/v1/calls/${callId}/participants/${userId}`);
  },

  listParticipants: async (
    callId: string
  ): Promise<ApiResponse<{ participants: CallParticipant[] }>> => {
    return apiClient.get(`/v1/calls/${callId}/participants`);
  },

  updateParticipantStatus: async (
    callId: string,
    userId: string,
    data: UpdateParticipantStatusRequest
  ): Promise<ApiResponse<void>> => {
    return apiClient.put(`/v1/calls/${callId}/participants/${userId}/status`, data);
  },

  updateParticipantMute: async (
    callId: string,
    userId: string,
    data: UpdateParticipantMuteRequest
  ): Promise<ApiResponse<void>> => {
    return apiClient.put(`/v1/calls/${callId}/participants/${userId}/mute`, data);
  },

  // Call Actions
  markConnected: async (callId: string): Promise<ApiResponse<void>> => {
    return apiClient.post(`/v1/calls/${callId}/connected`);
  },

  end: async (callId: string, data: EndCallRequest): Promise<ApiResponse<void>> => {
    return apiClient.post(`/v1/calls/${callId}/end`, data);
  },

  getDuration: async (callId: string): Promise<ApiResponse<{ duration: number }>> => {
    return apiClient.get(`/v1/calls/${callId}/duration`);
  },

  // Quality Metrics
  recordQualityMetric: async (
    data: RecordQualityMetricRequest
  ): Promise<ApiResponse<CallQualityMetric>> => {
    return apiClient.post('/v1/calls/quality', data);
  },
};
