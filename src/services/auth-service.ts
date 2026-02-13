import { apiClient } from './api-client';
import {
  ApiResponse,
  AuthTokens,
  LoginRequest,
  RegisterRequest,
  RefreshRequest,
  User,
  UserSession,
} from '@/types';

export const authService = {
  register: async (data: RegisterRequest): Promise<ApiResponse<AuthTokens & { user_id: string }>> => {
    return apiClient.post('/v1/auth/register', data);
  },

  login: async (data: LoginRequest): Promise<ApiResponse<AuthTokens & { user_id: string }>> => {
    return apiClient.post('/v1/auth/login', data);
  },

  refresh: async (data: RefreshRequest): Promise<ApiResponse<AuthTokens>> => {
    return apiClient.post('/v1/auth/refresh', data);
  },

  logout: async (sessionId: string): Promise<ApiResponse<void>> => {
    return apiClient.post('/v1/auth/logout', { session_id: sessionId });
  },

  logoutAll: async (): Promise<ApiResponse<void>> => {
    return apiClient.post('/v1/auth/logout-all');
  },

  getSessions: async (): Promise<ApiResponse<{ sessions: UserSession[] }>> => {
    return apiClient.get('/v1/auth/sessions');
  },

  forgotPassword: async (identity: string): Promise<ApiResponse<void>> => {
    return apiClient.post('/v1/auth/password/forgot', { identity });
  },

  resetPassword: async (identity: string, newPassword: string): Promise<ApiResponse<void>> => {
    return apiClient.post('/v1/auth/password/reset', { identity, new_password: newPassword });
  },
};
