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

export function useSessions() {
  return useQuery({
    queryKey: ['auth', 'sessions'],
    queryFn: async () => {
      const response = await userService.getSessions();
      if (!response.success) {
        throw new Error(response.error);
      }
      return response.data?.sessions || [];
    },
  });
}
