'use client';

import { useMutation, useQuery, keepPreviousData, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth-store';
import { useUiStore } from '@/stores/ui-store';
import { queryKeys } from '@/queries/query-keys';
import {
  getNotificationSettings,
  updateNotificationSettings,
} from '@/services/notification-service';
import {
  getProfileMetrics,
  mapSessionsToDevices,
  updateProfile,
} from '@/services/user-service';
import { listSessions } from '@/services/auth-service';
import { addContact, listContacts, removeContact, searchUsers } from '@/services/user-service-api';
import type {
  AuthSession,
  Contact,
  LocalUserPreferences,
  NotificationSettings,
} from '@/types';

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

  return useQuery({
    queryKey: queryKeys.userPreferences,
    queryFn: async () => {
      try {
        const remote = await getNotificationSettings();
        return {
          ...preferences,
          sound_enabled: remote.sound_enabled,
          in_app_notifications: remote.in_app_enabled,
          show_message_preview: remote.show_message_preview,
        };
      } catch {
        return preferences;
      }
    },
    initialData: preferences,
  });
}

function notificationSettingsPatchFromPreferences(
  payload: Partial<LocalUserPreferences>,
  next: LocalUserPreferences
): Partial<NotificationSettings> {
  const patch: Partial<NotificationSettings> = {};

  if (Object.prototype.hasOwnProperty.call(payload, 'in_app_notifications')) {
    patch.in_app_enabled = next.in_app_notifications;
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'sound_enabled')) {
    patch.sound_enabled = next.sound_enabled;
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'show_message_preview')) {
    patch.show_message_preview = next.show_message_preview;
  }

  return patch;
}

export function useUpdateSettings() {
  const setPreference = useUiStore((state) => state.setPreference);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: Partial<LocalUserPreferences>) => {
      const current = useUiStore.getState().preferences;
      const next = { ...current, ...payload };

      const notificationPatch = notificationSettingsPatchFromPreferences(
        payload,
        next
      );
      let remoteSettings: NotificationSettings | undefined;
      if (Object.keys(notificationPatch).length > 0) {
        remoteSettings = await updateNotificationSettings(notificationPatch);
        next.in_app_notifications = remoteSettings.in_app_enabled;
        next.sound_enabled = remoteSettings.sound_enabled;
        next.show_message_preview = remoteSettings.show_message_preview;
      }

      return {
        nextPreferences: next,
        remoteSettings,
      };
    },
    onSuccess: ({ nextPreferences, remoteSettings }) => {
      for (const [key, value] of Object.entries(nextPreferences)) {
        setPreference(key as keyof LocalUserPreferences, value as LocalUserPreferences[keyof LocalUserPreferences]);
      }
      queryClient.setQueryData(queryKeys.userPreferences, nextPreferences);
      if (remoteSettings) {
        queryClient.setQueryData(queryKeys.notificationSettings, remoteSettings);
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
