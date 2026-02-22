import { apiClient } from './api-client';
import {
  ApiResponse,
  User,
  UserSettings,
  UserContact,
  Device,
  PushToken,
  UserSession,
  UpdateProfileRequest,
  UpdateSettingsRequest,
} from '@/types';

export const userService = {
  list: async (page = 1, limit = 20, search?: string): Promise<ApiResponse<{ users: User[]; total: number }>> => {
    return apiClient.get('/v1/users', { params: { page, limit, search } });
  },

  getProfile: async (): Promise<ApiResponse<User>> => {
    return apiClient.get('/v1/users/me');
  },

  updateProfile: async (data: UpdateProfileRequest): Promise<ApiResponse<User>> => {
    return apiClient.put('/v1/users/me', data);
  },

  deleteProfile: async (): Promise<ApiResponse<void>> => {
    return apiClient.delete('/v1/users/me');
  },

  getSettings: async (): Promise<ApiResponse<UserSettings>> => {
    return apiClient.get('/v1/users/me/settings');
  },

  updateSettings: async (data: UpdateSettingsRequest): Promise<ApiResponse<UserSettings>> => {
    return apiClient.put('/v1/users/me/settings', data);
  },

  listContacts: async (): Promise<ApiResponse<{ contacts: UserContact[] }>> => {
    return apiClient.get('/v1/users/me/contacts');
  },

  addContact: async (contactUserId: string): Promise<ApiResponse<{ success: boolean }>> => {
    return apiClient.post('/v1/users/me/contacts', { contact_user_id: contactUserId });
  },

  removeContact: async (contactId: string): Promise<ApiResponse<void>> => {
    return apiClient.delete(`/v1/users/me/contacts/${contactId}`);
  },

  blockContact: async (contactId: string): Promise<ApiResponse<void>> => {
    return apiClient.post(`/v1/users/me/contacts/${contactId}/block`);
  },

  unblockContact: async (contactId: string): Promise<ApiResponse<void>> => {
    return apiClient.post(`/v1/users/me/contacts/${contactId}/unblock`);
  },

  getBlockedContacts: async (): Promise<ApiResponse<{ contacts: UserContact[] }>> => {
    return apiClient.get('/v1/users/me/contacts/blocked');
  },

  listDevices: async (): Promise<ApiResponse<{ devices: Device[] }>> => {
    return apiClient.get('/v1/users/me/devices');
  },

  getDevice: async (deviceId: string): Promise<ApiResponse<Device>> => {
    return apiClient.get(`/v1/users/me/devices/${deviceId}`);
  },

  deactivateDevice: async (deviceId: string): Promise<ApiResponse<void>> => {
    return apiClient.delete(`/v1/users/me/devices/${deviceId}`);
  },

  listPushTokens: async (): Promise<ApiResponse<{ tokens: PushToken[] }>> => {
    return apiClient.get('/v1/users/me/push-tokens');
  },

  getSessions: async (): Promise<ApiResponse<{ sessions: UserSession[] }>> => {
    return apiClient.get('/v1/auth/sessions');
  },

  revokeSession: async (sessionId: string): Promise<ApiResponse<void>> => {
    return apiClient.delete(`/v1/users/me/sessions/${sessionId}`);
  },

  revokeAllSessions: async (): Promise<ApiResponse<void>> => {
    return apiClient.delete('/v1/users/me/sessions');
  },
};
