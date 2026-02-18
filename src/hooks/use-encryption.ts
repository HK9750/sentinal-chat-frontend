/**
 * Encryption Hooks
 *
 * High-level hooks for end-to-end encryption using Signal Protocol.
 * Combines crypto library, IndexedDB storage, and API queries.
 */

import { useCallback, useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  initCrypto,
  generateIdentityKeyPair,
  generateSignedPreKey,
  generateOneTimePreKeys,
  generateEphemeralKeyPair,
  x3dhInitiator,
  x3dhResponder,
  initializeSessionAsInitiator,
  initializeSessionAsResponder,
  encryptMessage,
  decryptMessage,
  EncryptedMessage,
  serializeEncryptedMessage,
  deserializeEncryptedMessage,
  keyToBase64,
  base64ToKey,
  PreKeyBundle,
  IdentityKeyPair,
  KeyPair,
} from '@/lib/crypto';
import {
  storeIdentityKey,
  getIdentityKey,
  storeSignedPreKey,
  getActiveSignedPreKey,
  storeOneTimePreKeys,
  getOneTimePreKey,
  markOneTimePreKeyConsumed,
  getNextOneTimePreKeyId,
  getUnconsumedOneTimePreKeyCount,
  storeSession,
  getSession,
  hasSession,
  clearAllCryptoData,
} from '@/lib/crypto-storage';
import { encryptionService } from '@/services/encryption-service';
import { useAuthStore } from '@/stores/auth-store';
import { getServerDeviceId } from '@/lib/device';
import type { KeyBundle } from '@/types';

// ============================================================================
// Constants
// ============================================================================

const MIN_PREKEY_COUNT = 10;
const PREKEY_BATCH_SIZE = 20;

// ============================================================================
// Device ID Helper
// ============================================================================

/**
 * Get the server-assigned device UUID (devices.ID primary key).
 * This is set after login/register and used for all encryption API calls.
 * Throws if not yet available (user hasn't logged in on this device).
 */
function getStableDeviceId(): string {
  const id = getServerDeviceId();
  if (!id) {
    throw new Error('Server device ID not available. User must login first.');
  }
  return id;
}

// ============================================================================
// Key Generation Hook
// ============================================================================

/**
 * Generate and upload encryption keys for this device
 */
export function useGenerateKeys() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: async () => {
      if (!user) {
        throw new Error('User not authenticated');
      }

      console.log('[GenerateKeys] Starting key generation for user:', user.id);

      console.log('[GenerateKeys] Step 1/7: Initializing crypto library...');
      await initCrypto();
      console.log('[GenerateKeys] Step 1/7: Crypto library initialized');

      // Use the stable device fingerprint (same as login/register)
      const deviceId = getStableDeviceId();
      console.log('[GenerateKeys] Step 2/7: Device ID resolved:', deviceId);

      // Generate identity key pair
      console.log('[GenerateKeys] Step 3/7: Generating identity key pair...');
      const identityKeyPair = await generateIdentityKeyPair();
      await storeIdentityKey(deviceId, identityKeyPair);
      console.log('[GenerateKeys] Step 3/7: Identity key pair generated & stored locally');

      // Upload identity key to server
      console.log('[GenerateKeys] Step 4/7: Uploading identity key to server...');
      const identityUploadResult = await encryptionService.uploadIdentityKey({
        user_id: user.id,
        device_id: deviceId,
        public_key: keyToBase64(identityKeyPair.signing.publicKey),
      });
      console.log('[GenerateKeys] Step 4/7: Identity key uploaded', { success: identityUploadResult.success, error: identityUploadResult.error });
      if (!identityUploadResult.success) {
        throw new Error(`Identity key upload failed: ${identityUploadResult.error || 'unknown error'}`);
      }

      // Generate signed pre-key
      console.log('[GenerateKeys] Step 5/7: Generating signed pre-key...');
      const signedPreKey = await generateSignedPreKey(identityKeyPair, 1);
      await storeSignedPreKey(deviceId, signedPreKey);
      console.log('[GenerateKeys] Step 5/7: Signed pre-key generated & stored locally');

      // Upload signed pre-key to server
      console.log('[GenerateKeys] Step 6/7: Uploading signed pre-key to server...');
      const signedUploadResult = await encryptionService.uploadSignedPreKey({
        user_id: user.id,
        device_id: deviceId,
        key_id: signedPreKey.keyId,
        public_key: keyToBase64(signedPreKey.publicKey),
        signature: keyToBase64(signedPreKey.signature),
      });
      console.log('[GenerateKeys] Step 6/7: Signed pre-key uploaded', { success: signedUploadResult.success, error: signedUploadResult.error });
      if (!signedUploadResult.success) {
        throw new Error(`Signed pre-key upload failed: ${signedUploadResult.error || 'unknown error'}`);
      }

      // Generate one-time pre-keys
      console.log('[GenerateKeys] Step 7/7: Generating one-time pre-keys...');
      const oneTimePreKeys = await generateOneTimePreKeys(1, PREKEY_BATCH_SIZE);
      await storeOneTimePreKeys(deviceId, oneTimePreKeys);
      console.log(`[GenerateKeys] Step 7/7: ${oneTimePreKeys.length} one-time pre-keys generated & stored locally`);

      // Upload one-time pre-keys to server
      console.log('[GenerateKeys] Uploading one-time pre-keys to server...');
      const otpUploadResult = await encryptionService.uploadOneTimePreKeys({
        keys: oneTimePreKeys.map((k) => ({
          user_id: user.id,
          device_id: deviceId,
          key_id: k.keyId,
          public_key: keyToBase64(k.keyPair.publicKey),
        })),
      });
      console.log('[GenerateKeys] One-time pre-keys uploaded', { success: otpUploadResult.success, error: otpUploadResult.error });
      if (!otpUploadResult.success) {
        throw new Error(`One-time pre-key upload failed: ${otpUploadResult.error || 'unknown error'}`);
      }

      console.log('[GenerateKeys] All keys generated and uploaded successfully!');
      return { deviceId, success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['encryption'] });
    },
  });
}

// ============================================================================
// Session Establishment Hook
// ============================================================================

/**
 * Establish an encrypted session with another user
 */
export function useEstablishSession() {
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: async ({
      recipientUserId,
      recipientDeviceId,
    }: {
      recipientUserId: string;
      recipientDeviceId: string;
    }) => {
      if (!user) {
        throw new Error('User not authenticated');
      }

      await initCrypto();

      const deviceId = getStableDeviceId();

      // Check if we already have a session
      const existingSession = await getSession(recipientUserId, recipientDeviceId);
      if (existingSession) {
        return { session: existingSession, isNew: false };
      }

      // Get our identity key
      const ourIdentity = await getIdentityKey(deviceId);
      if (!ourIdentity) {
        throw new Error('No identity key found. Please set up encryption first.');
      }

      // Fetch recipient's key bundle from server
      const bundleResponse = await encryptionService.getKeyBundle({
        user_id: recipientUserId,
        device_id: recipientDeviceId,
        consumer_device_id: deviceId,
      });

      if (!bundleResponse.success || !bundleResponse.data) {
        throw new Error('Failed to fetch key bundle');
      }

      const keyBundle = bundleResponse.data;

      // Convert API bundle to crypto bundle
      const preKeyBundle: PreKeyBundle = {
        identityKey: base64ToKey(keyBundle.identity_key.public_key),
        signedPreKey: base64ToKey(keyBundle.signed_pre_key.public_key),
        signedPreKeyId: keyBundle.signed_pre_key.key_id,
        signedPreKeySignature: base64ToKey(keyBundle.signed_pre_key.signature),
        oneTimePreKey: keyBundle.one_time_pre_key
          ? base64ToKey(keyBundle.one_time_pre_key.public_key)
          : undefined,
        oneTimePreKeyId: keyBundle.one_time_pre_key?.key_id,
      };

      // Generate ephemeral key pair for X3DH
      const ephemeralKeyPair = await generateEphemeralKeyPair();

      // Perform X3DH key agreement
      const { sharedSecret, associatedData } = await x3dhInitiator(
        ourIdentity,
        ephemeralKeyPair,
        preKeyBundle
      );

      // Initialize Double Ratchet session
      const session = await initializeSessionAsInitiator(
        sharedSecret,
        associatedData,
        preKeyBundle.signedPreKey // Use signed pre-key as initial ratchet key
      );

      // Store session
      await storeSession(recipientUserId, recipientDeviceId, session);

      return { session, isNew: true, ephemeralPublicKey: ephemeralKeyPair.publicKey };
    },
  });
}

// ============================================================================
// Message Encryption Hook
// ============================================================================

export interface EncryptMessageResult {
  encryptedContent: string;
  ephemeralPublicKey?: string;
  usedOneTimePreKeyId?: number;
}

/**
 * Hook for encrypting messages
 */
export function useEncryptMessageMutation() {
  const establishSession = useEstablishSession();

  return useMutation({
    mutationFn: async ({
      recipientUserId,
      recipientDeviceId,
      plaintext,
    }: {
      recipientUserId: string;
      recipientDeviceId: string;
      plaintext: string;
    }): Promise<EncryptMessageResult> => {
      await initCrypto();

      // Ensure we have a session
      let session = await getSession(recipientUserId, recipientDeviceId);
      let ephemeralPublicKey: Uint8Array | undefined;

      if (!session) {
        // Establish session first
        const result = await establishSession.mutateAsync({
          recipientUserId,
          recipientDeviceId,
        });
        session = result.session;
        ephemeralPublicKey = result.ephemeralPublicKey;
      }

      // Encrypt the message
      const { encrypted, updatedSession } = await encryptMessage(session, plaintext);

      // Update stored session
      await storeSession(recipientUserId, recipientDeviceId, updatedSession);

      // Serialize for transmission
      const encryptedContent = serializeEncryptedMessage(encrypted);

      return {
        encryptedContent,
        ephemeralPublicKey: ephemeralPublicKey
          ? keyToBase64(ephemeralPublicKey)
          : undefined,
      };
    },
  });
}

// ============================================================================
// Message Decryption Hook
// ============================================================================

/**
 * Hook for decrypting messages
 */
export function useDecryptMessageMutation() {
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: async ({
      senderUserId,
      senderDeviceId,
      encryptedContent,
      ephemeralPublicKey,
      usedOneTimePreKeyId,
    }: {
      senderUserId: string;
      senderDeviceId: string;
      encryptedContent: string;
      ephemeralPublicKey?: string;
      usedOneTimePreKeyId?: number;
    }): Promise<string> => {
      if (!user) {
        throw new Error('User not authenticated');
      }

      await initCrypto();

      const deviceId = getStableDeviceId();
      let session = await getSession(senderUserId, senderDeviceId);

      // If no session and we have ephemeral key, this is the first message
      // We need to complete X3DH as responder
      if (!session && ephemeralPublicKey) {
        const ourIdentity = await getIdentityKey(deviceId);
        if (!ourIdentity) {
          throw new Error('No identity key found');
        }

        const ourSignedPreKey = await getActiveSignedPreKey(deviceId);
        if (!ourSignedPreKey) {
          throw new Error('No signed pre-key found');
        }

        let ourOneTimePreKey: KeyPair | null = null;
        if (usedOneTimePreKeyId !== undefined) {
          ourOneTimePreKey = await getOneTimePreKey(usedOneTimePreKeyId);
          if (ourOneTimePreKey) {
            await markOneTimePreKeyConsumed(usedOneTimePreKeyId);
          }
        }

        // Get sender's identity key from server
        const identityResponse = await encryptionService.getIdentityKey(
          senderUserId,
          senderDeviceId
        );
        if (!identityResponse.success || !identityResponse.data) {
          throw new Error('Failed to fetch sender identity key');
        }

        const senderIdentityKey = base64ToKey(identityResponse.data.public_key);
        const senderEphemeralKey = base64ToKey(ephemeralPublicKey);

        // Perform X3DH as responder
        const { sharedSecret, associatedData } = await x3dhResponder(
          ourIdentity,
          ourSignedPreKey,
          ourOneTimePreKey,
          senderIdentityKey,
          senderEphemeralKey
        );

        // Initialize session as responder
        session = await initializeSessionAsResponder(
          sharedSecret,
          associatedData,
          ourSignedPreKey
        );

        await storeSession(senderUserId, senderDeviceId, session);
      }

      if (!session) {
        throw new Error('No session found and cannot establish one');
      }

      // Decrypt the message
      const encrypted = deserializeEncryptedMessage(encryptedContent);
      const { plaintext, updatedSession } = await decryptMessage(session, encrypted);

      // Update stored session
      await storeSession(senderUserId, senderDeviceId, updatedSession);

      return plaintext;
    },
  });
}

// ============================================================================
// Prekey Replenishment Hook
// ============================================================================

/**
 * Check and replenish one-time prekeys if needed
 */
export function useReplenishPreKeys() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!user) {
        throw new Error('User not authenticated');
      }

      await initCrypto();

      const deviceId = getStableDeviceId();

      // Check server-side count
      const countResponse = await encryptionService.getPreKeyCount(user.id, deviceId);
      if (!countResponse.success) {
        throw new Error('Failed to check prekey count');
      }

      const serverCount = countResponse.data?.count ?? 0;

      if (serverCount < MIN_PREKEY_COUNT) {
        // Get next key ID
        const nextKeyId = await getNextOneTimePreKeyId(deviceId);

        // Generate new keys
        const newKeys = await generateOneTimePreKeys(nextKeyId, PREKEY_BATCH_SIZE);
        await storeOneTimePreKeys(deviceId, newKeys);

        // Upload to server
        await encryptionService.uploadOneTimePreKeys({
          keys: newKeys.map((k) => ({
            user_id: user.id,
            device_id: deviceId,
            key_id: k.keyId,
            public_key: keyToBase64(k.keyPair.publicKey),
          })),
        });

        return { replenished: true, count: PREKEY_BATCH_SIZE };
      }

      return { replenished: false, count: 0 };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['encryption', 'onetime-prekeys', 'count'],
      });
    },
  });
}

// ============================================================================
// Encryption Status Hook
// ============================================================================

/**
 * Check if encryption is set up for the current device
 */
export function useEncryptionStatus() {
  const { user } = useAuthStore();
  const [status, setStatus] = useState<{
    isSetup: boolean;
    deviceId: string | null;
    isLoading: boolean;
    error: Error | null;
  }>({
    isSetup: false,
    deviceId: null,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    async function checkStatus() {
      if (!user) {
        setStatus({
          isSetup: false,
          deviceId: null,
          isLoading: false,
          error: null,
        });
        return;
      }

      try {
        await initCrypto();
        const deviceId = getStableDeviceId();
        const identityKey = await getIdentityKey(deviceId);
        const signedPreKey = await getActiveSignedPreKey(deviceId);

        setStatus({
          isSetup: !!identityKey && !!signedPreKey,
          deviceId,
          isLoading: false,
          error: null,
        });
      } catch (error) {
        setStatus({
          isSetup: false,
          deviceId: null,
          isLoading: false,
          error: error as Error,
        });
      }
    }

    checkStatus();
  }, [user]);

  return status;
}

// ============================================================================
// Has Session Hook
// ============================================================================

/**
 * Check if we have an encrypted session with a user
 */
export function useHasSession(recipientUserId: string, recipientDeviceId: string) {
  return useQuery({
    queryKey: ['crypto', 'session', recipientUserId, recipientDeviceId],
    queryFn: () => hasSession(recipientUserId, recipientDeviceId),
    enabled: !!recipientUserId && !!recipientDeviceId,
  });
}

// ============================================================================
// Reset Encryption Hook
// ============================================================================

/**
 * Clear all local encryption data (useful for logout or key rotation)
 */
export function useResetEncryption() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await clearAllCryptoData();
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['encryption'] });
      queryClient.invalidateQueries({ queryKey: ['crypto'] });
    },
  });
}

// ============================================================================
// Convenience Hooks for Components
// ============================================================================

/**
 * Combined hook for message encryption with automatic session establishment
 */
export function useSecureMessage() {
  const encryptMutation = useEncryptMessageMutation();
  const decryptMutation = useDecryptMessageMutation();
  const { isSetup, isLoading: statusLoading } = useEncryptionStatus();

  const encrypt = useCallback(
    async (recipientUserId: string, recipientDeviceId: string, message: string) => {
      if (!isSetup) {
        throw new Error('Encryption not set up');
      }
      return encryptMutation.mutateAsync({
        recipientUserId,
        recipientDeviceId,
        plaintext: message,
      });
    },
    [encryptMutation, isSetup]
  );

  const decrypt = useCallback(
    async (
      senderUserId: string,
      senderDeviceId: string,
      encryptedContent: string,
      ephemeralPublicKey?: string,
      usedOneTimePreKeyId?: number
    ) => {
      if (!isSetup) {
        throw new Error('Encryption not set up');
      }
      return decryptMutation.mutateAsync({
        senderUserId,
        senderDeviceId,
        encryptedContent,
        ephemeralPublicKey,
        usedOneTimePreKeyId,
      });
    },
    [decryptMutation, isSetup]
  );

  return {
    encrypt,
    decrypt,
    isReady: isSetup && !statusLoading,
    isEncrypting: encryptMutation.isPending,
    isDecrypting: decryptMutation.isPending,
    encryptError: encryptMutation.error,
    decryptError: decryptMutation.error,
  };
}
