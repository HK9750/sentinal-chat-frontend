import axios, { AxiosError, type AxiosProgressEvent, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { env } from '@/config/env';
import { API_ROUTES } from '@/lib/constants';
import { setAuthCookie } from '@/lib/cookies';
import { useAuthStore } from '@/stores/auth-store';
import type { ApiEnvelope, AuthPayload } from '@/types';

type RetriableConfig = InternalAxiosRequestConfig & { _retry?: boolean };

class ApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status = 500, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

const apiClient = axios.create({
  baseURL: env.apiUrl,
  withCredentials: true,
});

const refreshClient = axios.create({
  baseURL: env.apiUrl,
  withCredentials: true,
});

function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }

  if (axios.isAxiosError<ApiEnvelope<unknown>>(error)) {
    const status = error.response?.status ?? 500;
    const message = error.response?.data?.error ?? error.message ?? 'Request failed.';
    return new ApiError(message, status, error.response?.data?.code);
  }

  if (error instanceof Error) {
    return new ApiError(error.message);
  }

  return new ApiError('Unexpected request failure.');
}

let refreshPromise: Promise<AuthPayload | null> | null = null;

async function refreshAccessToken(): Promise<AuthPayload | null> {
  if (!refreshPromise) {
    refreshPromise = refreshClient
      .post<ApiEnvelope<AuthPayload>>(API_ROUTES.auth.refresh)
      .then((response) => {
        const payload = response.data.data;
        useAuthStore.getState().setAuth(payload);
        setAuthCookie(payload.tokens.access_token, payload.tokens.expires_at);
        return payload;
      })
      .catch(() => {
        useAuthStore.getState().resetAuth();
        return null;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().tokens?.access_token;

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiEnvelope<unknown>>) => {
    const config = error.config as RetriableConfig | undefined;
    const isRefreshRequest = config?.url?.includes(API_ROUTES.auth.refresh);

    if (error.response?.status === 401 && config && !config._retry && !isRefreshRequest) {
      config._retry = true;

      const payload = await refreshAccessToken();

      if (payload?.tokens.access_token) {
        config.headers.Authorization = `Bearer ${payload.tokens.access_token}`;
        return apiClient(config);
      }
    }

    throw toApiError(error);
  }
);

export async function unwrapData<T>(request: Promise<AxiosResponse<ApiEnvelope<T>>>): Promise<T> {
  const response = await request;

  if (!response.data.success) {
    throw new ApiError(response.data.error ?? 'Request failed.', response.status, response.data.code);
  }

  return response.data.data;
}

export function getUploadProgress(event: AxiosProgressEvent): number {
  if (!event.total) {
    return 0;
  }

  return Math.min(100, Math.round((event.loaded / event.total) * 100));
}

export { apiClient, refreshAccessToken };
