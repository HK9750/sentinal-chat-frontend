'use client';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { DEFAULT_PREFERENCES, STORAGE_KEYS } from '@/lib/constants';
import type { LocalUserPreferences } from '@/types';

interface UiState {
  sidebarCollapsed: boolean;
  messageSearchOpen: boolean;
  preferences: LocalUserPreferences;
  toggleSidebar: () => void;
  setMessageSearchOpen: (open: boolean) => void;
  setPreference: <Key extends keyof LocalUserPreferences>(key: Key, value: LocalUserPreferences[Key]) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      messageSearchOpen: false,
      preferences: DEFAULT_PREFERENCES,
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setMessageSearchOpen: (messageSearchOpen) => set({ messageSearchOpen }),
      setPreference: (key, value) =>
        set((state) => ({
          preferences: {
            ...state.preferences,
            [key]: value,
          },
        })),
    }),
    {
      name: STORAGE_KEYS.ui,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        preferences: state.preferences,
      }),
    }
  )
);
