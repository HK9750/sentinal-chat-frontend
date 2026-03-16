'use client';

import { create } from 'zustand';
import { clearAuthCookie, setAuthCookie } from '@/lib/cookies';
import { clearConversationKeys } from '@/lib/crypto-storage';
import { clearDeviceState } from '@/lib/device';
import type { AuthPayload, AuthSession, AuthTokens, AuthUser } from '@/types';

type AuthStatus = 'anonymous' | 'authenticated';

interface AuthState {
  user: AuthUser | null;
  session: AuthSession | null;
  tokens: AuthTokens | null;
  status: AuthStatus;
  isAuthenticated: boolean;
  isHydrated: boolean;
  setAuth: (payload: AuthPayload) => void;
  updateTokens: (tokens: AuthTokens) => void;
  updateUser: (patch: Partial<AuthUser>) => void;
  clearAuth: () => void;
  resetAuth: () => void;
  markHydrated: () => void;
}

const anonymousState = {
  user: null,
  session: null,
  tokens: null,
  status: 'anonymous' as AuthStatus,
  isAuthenticated: false,
};

export const useAuthStore = create<AuthState>()(
  (set, get) => ({
    ...anonymousState,
    isHydrated: false,
    setAuth: (payload) => {
      set({
        user: payload.user,
        session: payload.session,
        tokens: payload.tokens,
        status: 'authenticated',
        isAuthenticated: true,
        isHydrated: true,
      });

      setAuthCookie(payload.tokens.access_token, payload.tokens.expires_at);
    },
    updateTokens: (tokens) => {
      set({ tokens, status: 'authenticated', isAuthenticated: true, isHydrated: true });
      setAuthCookie(tokens.access_token, tokens.expires_at);
    },
    updateUser: (patch) => {
      set((state) => ({
        user: state.user
          ? {
              ...state.user,
              ...patch,
            }
          : state.user,
      }));
    },
    clearAuth: () => {
      clearAuthCookie();
      clearDeviceState();
      clearConversationKeys();
      set({
        ...anonymousState,
        isHydrated: true,
      });
    },
    resetAuth: () => {
      clearAuthCookie();
      clearDeviceState();
      set({
        ...anonymousState,
        isHydrated: true,
      });
    },
    markHydrated: () => {
      const hasValidToken = Boolean(get().tokens?.access_token && get().tokens?.expires_at && new Date(get().tokens!.expires_at).getTime() > Date.now());

      if (!hasValidToken) {
        set({
          ...anonymousState,
          isHydrated: true,
        });
        return;
      }

      set({
        isHydrated: true,
        status: 'authenticated',
        isAuthenticated: true,
      });
    },
  })
);
