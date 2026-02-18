import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, AuthTokens } from '@/types';
import { setAuthCookie, clearAuthCookie } from '@/lib/cookies';
import { clearServerDeviceId } from '@/lib/device';

interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isHydrated: boolean;

  // Actions
  login: (user: User, tokens: AuthTokens) => void;
  logout: () => void;
  setUser: (user: User | null) => void;
  setHydrated: (hydrated: boolean) => void;
  updateUser: (updates: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      tokens: null,
      isAuthenticated: false,
      isHydrated: false,

      login: (user, tokens) => {
        setAuthCookie(tokens.access_token);
        set({
          user,
          tokens,
          isAuthenticated: true,
        });
      },

      logout: () => {
        clearAuthCookie();
        clearServerDeviceId();
        set({
          user: null,
          tokens: null,
          isAuthenticated: false,
        });
      },

      setUser: (user) => set({ user }),

      setHydrated: (hydrated) => set({ isHydrated: hydrated }),

      updateUser: (updates) => set((state) => ({
        user: state.user ? { ...state.user, ...updates } : null,
      })),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        tokens: state.tokens,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.setHydrated(true);
          // Restore cookie from persisted token
          if (state.tokens?.access_token) {
            setAuthCookie(state.tokens.access_token);
          }
        }
      },
    }
  )
);
