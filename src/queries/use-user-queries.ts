import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userService } from '@/services/user-service';
import { UpdateProfileRequest, UpdateSettingsRequest } from '@/types';

export function useUserProfile() {
  return useQuery({
    queryKey: ['user', 'profile'],
    queryFn: async () => {
      const response = await userService.getProfile();
      if (!response.success) {
        throw new Error(response.error);
      }
      return response.data;
    },
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateProfileRequest) => {
      const response = await userService.updateProfile(data);
      if (!response.success) {
        throw new Error(response.error);
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', 'profile'] });
    },
  });
}

export function useUserSettings() {
  return useQuery({
    queryKey: ['user', 'settings'],
    queryFn: async () => {
      const response = await userService.getSettings();
      if (!response.success) {
        throw new Error(response.error);
      }
      return response.data;
    },
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateSettingsRequest) => {
      const response = await userService.updateSettings(data);
      if (!response.success) {
        throw new Error(response.error);
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', 'settings'] });
    },
  });
}

export function useContacts() {
  return useQuery({
    queryKey: ['user', 'contacts'],
    queryFn: async () => {
      const response = await userService.listContacts();
      if (!response.success) {
        throw new Error(response.error);
      }
      return response.data?.contacts || [];
    },
  });
}

export function useAddContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contactUserId: string) => {
      const response = await userService.addContact(contactUserId);
      if (!response.success) {
        throw new Error(response.error);
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', 'contacts'] });
    },
  });
}

export function useRemoveContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contactId: string) => {
      const response = await userService.removeContact(contactId);
      if (!response.success) {
        throw new Error(response.error);
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', 'contacts'] });
    },
  });
}

export function useDevices() {
  return useQuery({
    queryKey: ['user', 'devices'],
    queryFn: async () => {
      const response = await userService.listDevices();
      if (!response.success) {
        throw new Error(response.error);
      }
      return response.data?.devices || [];
    },
  });
}

/**
 * Search users by query string
 * Used for finding users when creating new conversations
 */
export function useSearchUsers(query: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['users', 'search', query],
    queryFn: async () => {
      const response = await userService.list(1, 20, query);
      if (!response.success) {
        throw new Error(response.error);
      }
      return response.data?.users || [];
    },
    enabled: (options?.enabled ?? true) && query.length >= 2,
    staleTime: 30_000,
  });
}

/**
 * Get a paginated list of users
 */
export function useUsers(page = 1, limit = 20) {
  return useQuery({
    queryKey: ['users', 'list', page, limit],
    queryFn: async () => {
      const response = await userService.list(page, limit);
      if (!response.success) {
        throw new Error(response.error);
      }
      return response.data;
    },
    staleTime: 60_000,
  });
}
