'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getClientDeviceInput } from '@/lib/device';
import { clearAuthCookie } from '@/lib/cookies';
import {
  exchangeOAuthCode,
  getOAuthAuthorizeUrl,
  logout,
  logoutAll,
  login,
  register,
  listSessions,
} from '@/services/auth-service';
import { useAuthStore } from '@/stores/auth-store';
import { queryKeys } from '@/queries/query-keys';
import type { LoginRequest, OAuthAuthorizeRequest, OAuthExchangeRequest, OAuthProvider, RegisterRequest } from '@/types';

export function useLoginMutation() {
  const setAuth = useAuthStore((state) => state.setAuth);

  return useMutation({
    mutationFn: (input: Omit<LoginRequest, 'device'>) => login({ ...input, device: getClientDeviceInput() }),
    onSuccess: (payload) => {
      setAuth(payload);
    },
  });
}

export const useLogin = useLoginMutation;

export function useRegisterMutation() {
  const setAuth = useAuthStore((state) => state.setAuth);

  return useMutation({
    mutationFn: (input: Omit<RegisterRequest, 'device'>) => register({ ...input, device: getClientDeviceInput() }),
    onSuccess: (payload) => {
      setAuth(payload);
    },
  });
}

export const useRegister = useRegisterMutation;

export function useOAuthAuthorizeMutation() {
  return useMutation({
    mutationFn: ({ provider, input }: { provider: OAuthProvider; input: OAuthAuthorizeRequest }) =>
      getOAuthAuthorizeUrl(provider, input),
  });
}

export function useOAuthExchangeMutation() {
  const setAuth = useAuthStore((state) => state.setAuth);

  return useMutation({
    mutationFn: ({ provider, input }: { provider: OAuthProvider; input: Omit<OAuthExchangeRequest, 'device'> }) =>
      exchangeOAuthCode(provider, { ...input, device: getClientDeviceInput() }),
    onSuccess: (payload) => {
      setAuth(payload);
    },
  });
}

export function useLogoutMutation() {
  const queryClient = useQueryClient();
  const clearAuth = useAuthStore((state) => state.clearAuth);

  return useMutation({
    mutationFn: (sessionId?: string) => logout(sessionId),
    onSettled: () => {
      clearAuthCookie();
      clearAuth();
      queryClient.clear();
    },
  });
}

export const useLogout = useLogoutMutation;

export function useLogoutAllMutation() {
  const queryClient = useQueryClient();
  const clearAuth = useAuthStore((state) => state.clearAuth);

  return useMutation({
    mutationFn: () => logoutAll(),
    onSettled: () => {
      clearAuthCookie();
      clearAuth();
      queryClient.clear();
    },
  });
}

export const useLogoutAll = useLogoutAllMutation;

export function useSessionsQuery() {
  const isAuthenticated = useAuthStore((state) => state.status === 'authenticated');

  return useQuery({
    queryKey: queryKeys.sessions,
    queryFn: () => listSessions(),
    enabled: isAuthenticated,
  });
}

export const useSessions = useSessionsQuery;
