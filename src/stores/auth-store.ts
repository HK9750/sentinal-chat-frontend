'use client';

import { create } from 'zustand';
import { clearDeviceState } from '@/lib/device';
import { clearAllPendingMessageTimeouts } from '@/lib/pending-message-timeouts';
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
    },
    updateTokens: (tokens) => {
      set({ tokens, status: 'authenticated', isAuthenticated: true, isHydrated: true });
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
      clearDeviceState();
      clearAllPendingMessageTimeouts();
      set({
        ...anonymousState,
        isHydrated: true,
      });
    },
    resetAuth: () => {
      clearDeviceState();
      clearAllPendingMessageTimeouts();
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
