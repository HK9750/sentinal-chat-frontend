import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  encryptionService,
  UploadIdentityKeyRequest,
  UploadSignedPreKeyRequest,
  RotateSignedPreKeyRequest,
  UploadOneTimePreKeysRequest,
  ConsumeOneTimePreKeyParams,
  GetKeyBundleParams,
} from '@/services/encryption-service';

export function useIdentityKey(userId: string, deviceId: string) {
  return useQuery({
    queryKey: ['encryption', 'identity', userId, deviceId],
    queryFn: async () => {
      const response = await encryptionService.getIdentityKey(userId, deviceId);
      if (!response.success) {
        throw new Error(response.error);
      }
      return response.data;
    },
    enabled: !!userId && !!deviceId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useUploadIdentityKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UploadIdentityKeyRequest) => {
      const response = await encryptionService.uploadIdentityKey(data);
      if (!response.success) {
        throw new Error(response.error);
      }
      return response.data;
    },
    onSuccess: (_, { user_id, device_id }) => {
      queryClient.invalidateQueries({
        queryKey: ['encryption', 'identity', user_id, device_id],
      });
    },
  });
}

export function useDeactivateIdentityKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (keyId: string) => {
      const response = await encryptionService.deactivateIdentityKey(keyId);
      if (!response.success) {
        throw new Error(response.error);
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['encryption', 'identity'],
      });
    },
  });
}

export function useDeleteIdentityKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (keyId: string) => {
      const response = await encryptionService.deleteIdentityKey(keyId);
      if (!response.success) {
        throw new Error(response.error);
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['encryption', 'identity'],
      });
    },
  });
}

export function useSignedPreKey(userId: string, deviceId: string, keyId: number) {
  return useQuery({
    queryKey: ['encryption', 'signed-prekey', userId, deviceId, keyId],
    queryFn: async () => {
      const response = await encryptionService.getSignedPreKey(userId, deviceId, keyId);
      if (!response.success) {
        throw new Error(response.error);
      }
      return response.data;
    },
    enabled: !!userId && !!deviceId && keyId !== undefined,
    staleTime: 5 * 60 * 1000,
  });
}

export function useActiveSignedPreKey(userId: string, deviceId: string) {
  return useQuery({
    queryKey: ['encryption', 'signed-prekey', 'active', userId, deviceId],
    queryFn: async () => {
      const response = await encryptionService.getActiveSignedPreKey(userId, deviceId);
      if (!response.success) {
        throw new Error(response.error);
      }
      return response.data;
    },
    enabled: !!userId && !!deviceId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useUploadSignedPreKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UploadSignedPreKeyRequest) => {
      const response = await encryptionService.uploadSignedPreKey(data);
      if (!response.success) {
        throw new Error(response.error);
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['encryption', 'signed-prekey'],
      });
    },
  });
}

export function useRotateSignedPreKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: RotateSignedPreKeyRequest) => {
      const response = await encryptionService.rotateSignedPreKey(data);
      if (!response.success) {
        throw new Error(response.error);
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['encryption', 'signed-prekey'],
      });
    },
  });
}

export function usePreKeyCount(userId: string, deviceId: string) {
  return useQuery({
    queryKey: ['encryption', 'onetime-prekeys', 'count', userId, deviceId],
    queryFn: async () => {
      const response = await encryptionService.getPreKeyCount(userId, deviceId);
      if (!response.success) {
        throw new Error(response.error);
      }
      return response.data?.count || 0;
    },
    enabled: !!userId && !!deviceId,
    staleTime: 30_000,
  });
}

export function useUploadOneTimePreKeys() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UploadOneTimePreKeysRequest) => {
      const response = await encryptionService.uploadOneTimePreKeys(data);
      if (!response.success) {
        throw new Error(response.error);
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['encryption', 'onetime-prekeys', 'count'],
      });
    },
  });
}

export function useConsumeOneTimePreKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: ConsumeOneTimePreKeyParams) => {
      const response = await encryptionService.consumeOneTimePreKey(params);
      if (!response.success) {
        throw new Error(response.error);
      }
      return response.data;
    },
    onSuccess: (_, params) => {
      queryClient.invalidateQueries({
        queryKey: [
          'encryption',
          'onetime-prekeys',
          'count',
          params.user_id,
          params.device_id,
        ],
      });
    },
  });
}

export function useKeyBundle(params: GetKeyBundleParams) {
  return useQuery({
    queryKey: [
      'encryption',
      'bundle',
      params.user_id,
      params.device_id,
      params.consumer_device_id,
    ],
    queryFn: async () => {
      const response = await encryptionService.getKeyBundle(params);
      if (!response.success) {
        throw new Error(response.error);
      }
      return response.data;
    },
    enabled: !!params.user_id && !!params.device_id && !!params.consumer_device_id,
    staleTime: 0,
  });
}

export function useHasActiveKeys(userId: string, deviceId: string) {
  return useQuery({
    queryKey: ['encryption', 'keys', 'active', userId, deviceId],
    queryFn: async () => {
      const response = await encryptionService.checkActiveKeys(userId, deviceId);
      if (!response.success) {
        throw new Error(response.error);
      }
      return response.data?.has_active_keys || false;
    },
    enabled: !!userId && !!deviceId,
    staleTime: 60_000,
  });
}
