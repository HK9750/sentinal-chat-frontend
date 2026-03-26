'use client';

import { useMutation, useQuery, keepPreviousData, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth-store';
import { useUiStore } from '@/stores/ui-store';
import { queryKeys } from '@/queries/query-keys';
import {
  getProfileMetrics,
  mapSessionsToDevices,
  updateProfile,
} from '@/services/user-service';
import { listSessions } from '@/services/auth-service';
import { addContact, listContacts, removeContact, searchUsers } from '@/services/user-service-api';
import type { AuthSession, Contact, LocalUserPreferences } from '@/types';

export function useProfileMetricsQuery() {
  return useQuery({
    queryKey: queryKeys.profileMetrics,
    queryFn: () => getProfileMetrics(),
  });
}

export function useDevicesQuery() {
  return useQuery({
    queryKey: [...queryKeys.sessionsItems, 'devices'],
    queryFn: async () => mapSessionsToDevices((await listSessions()).items),
  });
}

export function useUserProfile() {
  const user = useAuthStore((state) => state.user);

  return {
    data: user,
    isLoading: false,
    isError: false,
  };
}

export function useUpdateProfile() {
  const updateUser = useAuthStore((state) => state.updateUser);

  return useMutation({
    mutationFn: updateProfile,
    onSuccess: (payload) => {
      updateUser(payload);
    },
  });
}

export function useContacts() {
  return useQuery({
    queryKey: queryKeys.contacts,
    queryFn: async () => (await listContacts()).items,
    initialData: [] as Contact[],
  });
}

export function useSearchUsers(query: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.userSearch(query),
    queryFn: async () => (await searchUsers(query)).items,
    enabled: (options?.enabled ?? false) && query.trim().length > 0,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

export function useAddContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: addContact,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.contacts });
      queryClient.invalidateQueries({ queryKey: ['users', 'search'] });
    },
  });
}

export function useRemoveContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: removeContact,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.contacts });
      queryClient.invalidateQueries({ queryKey: ['users', 'search'] });
    },
  });
}

export function useUserSettings() {
  const preferences = useUiStore((state) => state.preferences);

  return {
    data: preferences,
    isLoading: false,
    isError: false,
  };
}

export function useUpdateSettings() {
  const preferences = useUiStore((state) => state.preferences);
  const setPreference = useUiStore((state) => state.setPreference);

  return useMutation({
    mutationFn: async (payload: Partial<LocalUserPreferences>) => ({ ...preferences, ...payload }),
    onSuccess: (preferences) => {
      for (const [key, value] of Object.entries(preferences)) {
        setPreference(key as keyof LocalUserPreferences, value as LocalUserPreferences[keyof LocalUserPreferences]);
      }
    },
  });
}

export function useDevices() {
  return useDevicesQuery();
}

export function useSessions() {
  return useQuery({
    queryKey: queryKeys.sessionsItems,
    queryFn: async () => (await listSessions()).items,
    initialData: [] as AuthSession[],
  });
}
