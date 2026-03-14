'use client';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { STORAGE_KEYS } from '@/lib/constants';
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
  markHydrated: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      session: null,
      tokens: null,
      status: 'anonymous',
      isAuthenticated: false,
      isHydrated: false,
      setAuth: (payload) => {
        set({
          user: payload.user,
          session: payload.session,
          tokens: payload.tokens,
          status: 'authenticated',
          isAuthenticated: true,
        });

        setAuthCookie(payload.tokens.access_token, payload.tokens.expires_at);
      },
      updateTokens: (tokens) => {
        set({ tokens, status: 'authenticated', isAuthenticated: true });
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
          user: null,
          session: null,
          tokens: null,
          status: 'anonymous',
          isAuthenticated: false,
        });
      },
      markHydrated: () => {
        const hasTokens = Boolean(get().tokens?.access_token);
        set({
          isHydrated: true,
          status: hasTokens ? 'authenticated' : 'anonymous',
          isAuthenticated: hasTokens,
        });
      },
    }),
    {
      name: STORAGE_KEYS.auth,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        session: state.session,
        tokens: state.tokens,
        status: state.status,
      }),
      onRehydrateStorage: () => (state) => {
        state?.markHydrated();
      },
    }
  )
);
