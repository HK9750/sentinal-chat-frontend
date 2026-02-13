import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authService } from '@/services/auth-service';
import { apiClient } from '@/services/api-client';
import { useAuthStore } from '@/stores/auth-store';
import { LoginRequest, RegisterRequest } from '@/types';
import { v4 as uuidv4 } from 'uuid';

const DEVICE_ID_KEY = 'device_id';

function getDeviceId(): string {
  if (typeof window === 'undefined') return '';
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = uuidv4();
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
}

export function useLogin() {
  const queryClient = useQueryClient();
  const login = useAuthStore((state) => state.login);

  return useMutation({
    mutationFn: async (data: Omit<LoginRequest, 'device_id' | 'device_name' | 'device_type'>) => {
      const response = await authService.login({
        ...data,
        device_id: getDeviceId(),
        device_name: navigator.userAgent,
        device_type: 'web',
      });
      return response;
    },
    onSuccess: (response) => {
      if (response.success && response.data) {
        apiClient.setAuthTokens(response.data);
        // Fetch user profile after login
        queryClient.invalidateQueries({ queryKey: ['user', 'profile'] });
      }
    },
  });
}

export function useRegister() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Omit<RegisterRequest, 'device_id' | 'device_name' | 'device_type'>) => {
      const response = await authService.register({
        ...data,
        device_id: getDeviceId(),
        device_name: navigator.userAgent,
        device_type: 'web',
      });
      return response;
    },
    onSuccess: (response) => {
      if (response.success && response.data) {
        apiClient.setAuthTokens(response.data);
      }
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  const logout = useAuthStore((state) => state.logout);

  return useMutation({
    mutationFn: async (sessionId: string) => {
      const response = await authService.logout(sessionId);
      return response;
    },
    onSuccess: () => {
      apiClient.clearAuth();
      logout();
      queryClient.clear();
    },
  });
}

export function useLogoutAll() {
  const queryClient = useQueryClient();
  const logout = useAuthStore((state) => state.logout);

  return useMutation({
    mutationFn: async () => {
      const response = await authService.logoutAll();
      return response;
    },
    onSuccess: () => {
      apiClient.clearAuth();
      logout();
      queryClient.clear();
    },
  });
}

export function useSessions() {
  return useQuery({
    queryKey: ['auth', 'sessions'],
    queryFn: async () => {
      const response = await authService.getSessions();
      if (!response.success) {
        throw new Error(response.error);
      }
      return response.data?.sessions || [];
    },
  });
}
