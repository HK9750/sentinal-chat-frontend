import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authService } from '@/services/auth-service';
import { useAuthStore } from '@/stores/auth-store';
import { LoginRequest, RegisterRequest } from '@/types';
import { getDeviceInfo, setServerDeviceId } from '@/lib/device';
import { useGenerateKeys, useRecoverKeys } from '@/hooks/use-encryption';

export function useLogin() {
  const queryClient = useQueryClient();
  const login = useAuthStore((state) => state.login);
  const generateKeys = useGenerateKeys();
  const recoverKeys = useRecoverKeys();

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
    onSuccess: async (response, variables) => {
      if (response.success && response.data) {
        if (response.data.device_id) {
          setServerDeviceId(response.data.device_id);
        }

        // login() writes tokens into Zustand (single source of truth).
        login(
          response.data.user,
          response.data
        );

        // Setup encryption seamlessly
        try {
          console.log('[Auth] Attempting key recovery...');
          await recoverKeys.mutateAsync({
            password: variables.password,
            userId: response.data.user.id,
            predefinedDeviceId: response.data.device_id,
          });
        } catch (err: any) {
          console.warn('[Auth] Key recovery failed:', err.message);
          // If no backup exists or it fails, fallback to generating new keys
          try {
            console.log('[Auth] Generating new keys instead...');
            await generateKeys.mutateAsync({
              password: variables.password,
              userId: response.data.user.id,
              deviceId: response.data.device_id || getDeviceInfo().id,
            });
          } catch (genErr) {
            console.error('[Auth] Failed to generate keys', genErr);
          }
        }

        await queryClient.invalidateQueries({ queryKey: ['user', 'profile'] });
      }
    },
  });
}

export function useRegister() {
  const queryClient = useQueryClient();
  const login = useAuthStore((state) => state.login);
  const generateKeys = useGenerateKeys();

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
    onSuccess: async (response, variables) => {
      if (response.success && response.data) {
        if (response.data.device_id) {
          setServerDeviceId(response.data.device_id);
        }

        login(
          response.data.user,
          response.data
        );

        // Subtly generate keys in the background
        try {
          console.log('[Auth] Generating encryption keys after registration...');
          await generateKeys.mutateAsync({
            password: variables.password,
            userId: response.data.user.id,
            deviceId: response.data.device_id || getDeviceInfo().id,
          });
        } catch (err) {
          console.error('[Auth] Failed to generate keys during registration', err);
        }
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
      logout();
      queryClient.clear();
      window.location.href = '/login';
    },
    onError: () => {
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
