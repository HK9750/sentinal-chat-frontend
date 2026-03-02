import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from 'axios';
import { env } from '@/config/env';
import { ApiResponse, AuthTokens } from '@/types';
import { useAuthStore } from '@/stores/auth-store';

class ApiClient {
  private client: AxiosInstance;
  private refreshPromise: Promise<string> | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: env.API_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    this.client.interceptors.request.use(
      (config) => {
        const tokens = this.getTokens();
        if (tokens?.access_token) {
          config.headers.Authorization = `Bearer ${tokens.access_token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError<ApiResponse<unknown>>) => {
        const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const newToken = await this.refreshToken();
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
            }
            return this.client(originalRequest);
          } catch (refreshError) {
            this.clearTokens();
            if (typeof window !== 'undefined') {
              window.location.href = '/login';
            }
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  // Single source of truth: read tokens from the Zustand auth store.
  // On the server (SSR) or before hydration, the store state is the
  // in-memory default (null).  On the client, Zustand's persist
  // middleware rehydrates from localStorage['auth-storage']
  // automatically — no separate localStorage key needed.
  private getTokens(): AuthTokens | null {
    return useAuthStore.getState().tokens;
  }

  private setTokens(tokens: AuthTokens) {
    useAuthStore.getState().updateTokens(tokens);
  }

  private clearTokens() {
    useAuthStore.getState().logout();
  }

  private async refreshToken(): Promise<string> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = (async () => {
      try {
        const tokens = this.getTokens();
        if (!tokens?.refresh_token || !tokens?.session_id) {
          throw new Error('No refresh token');
        }

        const response = await this.client.post<ApiResponse<AuthTokens>>('/v1/auth/refresh', {
          session_id: tokens.session_id,
          refresh_token: tokens.refresh_token,
        });

        if (response.data.success && response.data.data) {
          this.setTokens(response.data.data);
          return response.data.data.access_token;
        }
        throw new Error('Refresh failed');
      } finally {
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  async get<T>(url: string, config?: AxiosRequestConfig) {
    const response = await this.client.get<ApiResponse<T>>(url, config);
    return response.data;
  }

  async post<T>(url: string, data?: unknown, config?: AxiosRequestConfig) {
    const response = await this.client.post<ApiResponse<T>>(url, data, config);
    return response.data;
  }

  async put<T>(url: string, data?: unknown, config?: AxiosRequestConfig) {
    const response = await this.client.put<ApiResponse<T>>(url, data, config);
    return response.data;
  }

  async delete<T>(url: string, config?: AxiosRequestConfig) {
    const response = await this.client.delete<ApiResponse<T>>(url, config);
    return response.data;
  }

  // Public helpers kept for backward compat with login/register flows.
  // Both now delegate to Zustand — no separate storage.
  setAuthTokens(tokens: AuthTokens) {
    this.setTokens(tokens);
  }

  clearAuth() {
    this.clearTokens();
  }

  getAccessToken(): string | null {
    return this.getTokens()?.access_token || null;
  }
}

export const apiClient = new ApiClient();
