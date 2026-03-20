'use client';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { DEFAULT_PREFERENCES, STORAGE_KEYS } from '@/lib/constants';
import type { LocalUserPreferences } from '@/types';

interface UiState {
  preferences: LocalUserPreferences;
  setPreference: <Key extends keyof LocalUserPreferences>(key: Key, value: LocalUserPreferences[Key]) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      preferences: DEFAULT_PREFERENCES,
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
        preferences: state.preferences,
      }),
    }
  )
);
