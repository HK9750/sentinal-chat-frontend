import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authService } from '@/services/auth-service';
import { apiClient } from '@/services/api-client';
import { useAuthStore } from '@/stores/auth-store';
import { LoginRequest, RegisterRequest } from '@/types';
import { getDeviceInfo, setServerDeviceId } from '@/lib/device';

export function useLogin() {
  const queryClient = useQueryClient();
  const login = useAuthStore((state) => state.login);

  return useMutation({
    mutationFn: async (data: { identity: string; password: string }) => {
      const device = getDeviceInfo();
      const response = await authService.login({
        identity: data.identity,
        password: data.password,
        device_id: device.id,
        device_name: device.name,
        device_type: device.type,
      });
      return response;
    },
    onSuccess: async (response) => {
      if (response.success && response.data) {
        apiClient.setAuthTokens(response.data);

        // Store server-assigned device UUID for encryption APIs
        if (response.data.device_id) {
          setServerDeviceId(response.data.device_id);
        }

        login(
          response.data.user,
          response.data
        );
        await queryClient.invalidateQueries({ queryKey: ['user', 'profile'] });
      }
    },
  });
}

export function useRegister() {
  const queryClient = useQueryClient();
  const login = useAuthStore((state) => state.login);

  return useMutation({
    mutationFn: async (data: {
      email: string;
      username: string;
      display_name?: string;
      password: string
    }) => {
      const device = getDeviceInfo();
      const response = await authService.register({
        email: data.email,
        username: data.username,
        password: data.password,
        display_name: data.display_name || data.username,
        device_id: device.id,
        device_name: device.name,
        device_type: device.type,
      });
      return response;
    },
    onSuccess: (response) => {
      if (response.success && response.data) {
        apiClient.setAuthTokens(response.data);

        // Store server-assigned device UUID for encryption APIs
        if (response.data.device_id) {
          setServerDeviceId(response.data.device_id);
        }

        login(
          response.data.user,
          response.data
        );
      }
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  const logout = useAuthStore((state) => state.logout);
  const tokens = useAuthStore((state) => state.tokens);

  return useMutation({
    mutationFn: async () => {
      if (!tokens?.session_id) return;
      const response = await authService.logout(tokens.session_id);
      return response;
    },
    onSuccess: () => {
      apiClient.clearAuth();
      logout();
      queryClient.clear();
      window.location.href = '/login';
    },
    onError: () => {
      // Even if logout fails, clear local state
      apiClient.clearAuth();
      logout();
      queryClient.clear();
      window.location.href = '/login';
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
      window.location.href = '/login';
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
