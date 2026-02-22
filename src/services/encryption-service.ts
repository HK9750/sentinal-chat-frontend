import { apiClient } from './api-client';
import {
  ApiResponse,
  IdentityKey,
  SignedPreKey,
  OneTimePreKey,
  KeyBundle,
} from '@/types';

export interface UploadIdentityKeyRequest {
  user_id: string;
  device_id: string;
  public_key: string;
}

export interface UploadSignedPreKeyRequest {
  user_id: string;
  device_id: string;
  key_id: number;
  public_key: string;
  signature: string;
}

export interface RotateSignedPreKeyRequest {
  user_id: string;
  device_id: string;
  key: {
    key_id: number;
    public_key: string;
    signature: string;
  };
}

export interface UploadOneTimePreKeysRequest {
  keys: Array<{
    user_id: string;
    device_id: string;
    key_id: number;
    public_key: string;
  }>;
}

export interface ConsumeOneTimePreKeyParams {
  user_id: string;
  device_id: string;
  consumed_by: string;
  consumed_device_id: string;
}

export interface GetKeyBundleParams {
  user_id: string;
  device_id: string;
  consumer_device_id: string;
}

export const encryptionService = {
  uploadIdentityKey: async (
    data: UploadIdentityKeyRequest
  ): Promise<ApiResponse<IdentityKey>> => {
    return apiClient.post('/v1/encryption/identity', data);
  },

  getIdentityKey: async (
    userId: string,
    deviceId: string
  ): Promise<ApiResponse<IdentityKey>> => {
    return apiClient.get('/v1/encryption/identity', {
      params: { user_id: userId, device_id: deviceId },
    });
  },

  deactivateIdentityKey: async (keyId: string): Promise<ApiResponse<void>> => {
    return apiClient.put(`/v1/encryption/identity/${keyId}/deactivate`);
  },

  deleteIdentityKey: async (keyId: string): Promise<ApiResponse<void>> => {
    return apiClient.delete(`/v1/encryption/identity/${keyId}`);
  },

  uploadSignedPreKey: async (
    data: UploadSignedPreKeyRequest
  ): Promise<ApiResponse<SignedPreKey>> => {
    return apiClient.post('/v1/encryption/signed-prekeys', data);
  },

  getSignedPreKey: async (
    userId: string,
    deviceId: string,
    keyId: number
  ): Promise<ApiResponse<SignedPreKey>> => {
    return apiClient.get('/v1/encryption/signed-prekeys', {
      params: { user_id: userId, device_id: deviceId, key_id: keyId },
    });
  },

  getActiveSignedPreKey: async (
    userId: string,
    deviceId: string
  ): Promise<ApiResponse<SignedPreKey>> => {
    return apiClient.get('/v1/encryption/signed-prekeys/active', {
      params: { user_id: userId, device_id: deviceId },
    });
  },

  rotateSignedPreKey: async (
    data: RotateSignedPreKeyRequest
  ): Promise<ApiResponse<SignedPreKey>> => {
    return apiClient.post('/v1/encryption/signed-prekeys/rotate', data);
  },

  uploadOneTimePreKeys: async (
    data: UploadOneTimePreKeysRequest
  ): Promise<ApiResponse<{ uploaded: number }>> => {
    return apiClient.post('/v1/encryption/onetime-prekeys', data);
  },

  consumeOneTimePreKey: async (
    params: ConsumeOneTimePreKeyParams
  ): Promise<ApiResponse<OneTimePreKey>> => {
    return apiClient.post('/v1/encryption/onetime-prekeys/consume', null, {
      params: {
        user_id: params.user_id,
        device_id: params.device_id,
        consumed_by: params.consumed_by,
        consumed_device_id: params.consumed_device_id,
      },
    });
  },

  getPreKeyCount: async (
    userId: string,
    deviceId: string
  ): Promise<ApiResponse<{ count: number }>> => {
    return apiClient.get('/v1/encryption/onetime-prekeys/count', {
      params: { user_id: userId, device_id: deviceId },
    });
  },

  getKeyBundle: async (params: GetKeyBundleParams): Promise<ApiResponse<KeyBundle>> => {
    return apiClient.get('/v1/encryption/bundles', {
      params: {
        user_id: params.user_id,
        device_id: params.device_id,
        consumer_device_id: params.consumer_device_id,
      },
    });
  },

  checkActiveKeys: async (
    userId: string,
    deviceId: string
  ): Promise<ApiResponse<{ has_active_keys: boolean }>> => {
    return apiClient.get('/v1/encryption/keys/active', {
      params: { user_id: userId, device_id: deviceId },
    });
  },
};
