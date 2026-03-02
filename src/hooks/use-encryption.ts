
import { useCallback, useRef } from 'react';
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
  serializeEncryptedMessage,
  deserializeEncryptedMessage,
  keyToBase64,
  base64ToKey,
  PreKeyBundle,
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
  storeSession,
  getSession,
  clearAllCryptoData,
} from '@/lib/crypto-storage';
import { encryptionService } from '@/services/encryption-service';
import { useAuthStore } from '@/stores/auth-store';
import { getServerDeviceId } from '@/lib/device';

const MIN_PREKEY_COUNT = 10;
const PREKEY_BATCH_SIZE = 20;

function getStableDeviceId(): string {
  const id = getServerDeviceId();
  if (!id) {
    throw new Error('Server device ID not available. User must login first.');
  }
  return id;
}

export function useGenerateKeys() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: async () => {
      if (!user) {
        throw new Error('User not authenticated');
      }

      await initCrypto();

      const deviceId = getStableDeviceId();

      const identityKeyPair = await generateIdentityKeyPair();
      await storeIdentityKey(deviceId, identityKeyPair);

      const signedPreKey = await generateSignedPreKey(identityKeyPair, 1);
      await storeSignedPreKey(deviceId, signedPreKey);

      const oneTimePreKeys = await generateOneTimePreKeys(1, PREKEY_BATCH_SIZE);
      await storeOneTimePreKeys(deviceId, oneTimePreKeys);

      const setupResult = await encryptionService.setupEncryption({
        user_id: user.id,
        device_id: deviceId,
        identity_key: keyToBase64(identityKeyPair.signing.publicKey),
        signed_prekey: {
          key_id: signedPreKey.keyId,
          public_key: keyToBase64(signedPreKey.publicKey),
          signature: keyToBase64(signedPreKey.signature),
        },
        one_time_keys: oneTimePreKeys.map((k) => ({
          user_id: user.id,
          device_id: deviceId,
          key_id: k.keyId,
          public_key: keyToBase64(k.keyPair.publicKey),
        })),
      });

      if (!setupResult.success) {
        throw new Error(`Encryption setup failed: ${setupResult.error || 'unknown error'}`);
      }

      return { deviceId, success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['encryption'] });
    },
  });
}

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

      const existingSession = await getSession(recipientUserId, recipientDeviceId);
      if (existingSession) {
        return { session: existingSession, isNew: false };
      }

      const ourIdentity = await getIdentityKey(deviceId);
      if (!ourIdentity) {
        throw new Error('No identity key found. Please set up encryption first.');
      }

      const bundleResponse = await encryptionService.getKeyBundle({
        user_id: recipientUserId,
        device_id: recipientDeviceId,
        consumer_device_id: deviceId,
      });

      if (!bundleResponse.success || !bundleResponse.data) {
        throw new Error('Failed to fetch key bundle');
      }

      const keyBundle = bundleResponse.data;

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

      const ephemeralKeyPair = await generateEphemeralKeyPair();

      const { sharedSecret, associatedData } = await x3dhInitiator(
        ourIdentity,
        ephemeralKeyPair,
        preKeyBundle
      );

      const session = await initializeSessionAsInitiator(
        sharedSecret,
        associatedData,
        preKeyBundle.signedPreKey
      );

      await storeSession(recipientUserId, recipientDeviceId, session);

      return {
        session,
        isNew: true,
        ephemeralPublicKey: ephemeralKeyPair.publicKey,
        usedOneTimePreKeyId: preKeyBundle.oneTimePreKeyId,
      };
    },
  });
}

export interface EncryptMessageResult {
  encryptedContent: string;
  ephemeralPublicKey?: string;
  usedOneTimePreKeyId?: number;
}

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

      let session = await getSession(recipientUserId, recipientDeviceId);
      let ephemeralPublicKey: Uint8Array | undefined;
      let usedOneTimePreKeyId: number | undefined;

      if (!session) {
        const result = await establishSession.mutateAsync({
          recipientUserId,
          recipientDeviceId,
        });
        session = result.session;
        ephemeralPublicKey = result.ephemeralPublicKey;
        usedOneTimePreKeyId = result.usedOneTimePreKeyId;
      }

      const { encrypted, updatedSession } = await encryptMessage(session, plaintext);

      await storeSession(recipientUserId, recipientDeviceId, updatedSession);

      const encryptedContent = serializeEncryptedMessage(encrypted);

      return {
        encryptedContent,
        ephemeralPublicKey: ephemeralPublicKey
          ? keyToBase64(ephemeralPublicKey)
          : undefined,
        usedOneTimePreKeyId,
      };
    },
  });
}

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

        const identityResponse = await encryptionService.getIdentityKey(
          senderUserId,
          senderDeviceId
        );
        if (!identityResponse.success || !identityResponse.data) {
          throw new Error('Failed to fetch sender identity key');
        }

        const senderIdentityKey = base64ToKey(identityResponse.data.public_key);
        const senderEphemeralKey = base64ToKey(ephemeralPublicKey);

        const { sharedSecret, associatedData } = await x3dhResponder(
          ourIdentity,
          ourSignedPreKey,
          ourOneTimePreKey,
          senderIdentityKey,
          senderEphemeralKey
        );

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

      const encrypted = deserializeEncryptedMessage(encryptedContent);
      const { plaintext, updatedSession } = await decryptMessage(session, encrypted);

      await storeSession(senderUserId, senderDeviceId, updatedSession);

      return plaintext;
    },
  });
}

export function useDecryptCiphertext() {
  const decryptMutation = useDecryptMessageMutation();
  // Stable ref to avoid re-creating the callback when the mutation object changes
  const mutateRef = useRef(decryptMutation.mutateAsync);
  mutateRef.current = decryptMutation.mutateAsync;

  const decryptCiphertext = useCallback(
    async ({
      senderUserId,
      senderDeviceId,
      ciphertext,
      header,
    }: {
      senderUserId: string;
      senderDeviceId: string;
      ciphertext: string;
      header?: string | Record<string, unknown> | null;
    }): Promise<string> => {
      let rawCiphertext: string;
      try {
        rawCiphertext = atob(ciphertext);
      } catch {
        // If base64 decoding fails, the ciphertext is likely already raw text
        rawCiphertext = ciphertext;
      }

      const maybeJson = rawCiphertext.trim();
      const hasEncryptedPayload = maybeJson.startsWith('{') && maybeJson.includes('ratchetKey');
      if (!hasEncryptedPayload) {
        // Not an encrypted payload — return as plain text instead of throwing
        return rawCiphertext;
      }

      let parsedHeader: Record<string, unknown> = {};
      if (typeof header === 'string' && header.trim()) {
        try {
          parsedHeader = JSON.parse(header) as Record<string, unknown>;
        } catch {
          parsedHeader = {};
        }
      } else if (header && typeof header === 'object') {
        parsedHeader = header as Record<string, unknown>;
      }

      const ephemeralKey = parsedHeader.ephemeral_key;
      const usedOneTimePreKeyId = parsedHeader.one_time_pre_key_id;

      if (!ephemeralKey || typeof ephemeralKey !== 'string') {
        // Missing ephemeral key — return raw content rather than crashing
        return rawCiphertext;
      }

      return mutateRef.current({
        senderUserId,
        senderDeviceId,
        encryptedContent: rawCiphertext,
        ephemeralPublicKey: ephemeralKey,
        usedOneTimePreKeyId: typeof usedOneTimePreKeyId === 'number' ? usedOneTimePreKeyId : undefined,
      });
    },
    [] // stable — no deps, uses ref internally
  );

  return {
    decryptCiphertext,
    isDecrypting: decryptMutation.isPending,
  };
}

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

      const countResponse = await encryptionService.getPreKeyCount(user.id, deviceId);
      if (!countResponse.success) {
        throw new Error('Failed to check prekey count');
      }

      const serverCount = countResponse.data?.count ?? 0;
      if (serverCount < MIN_PREKEY_COUNT) {
        const nextKeyId = await getNextOneTimePreKeyId(deviceId);
        const newKeys = await generateOneTimePreKeys(nextKeyId, PREKEY_BATCH_SIZE);
        await storeOneTimePreKeys(deviceId, newKeys);

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

export function useEncryptionStatus() {
  const { user } = useAuthStore();

  const query = useQuery({
    queryKey: ['encryption', 'status', user?.id],
    queryFn: async () => {
      await initCrypto();
      const deviceId = getStableDeviceId();
      const identityKey = await getIdentityKey(deviceId);
      const signedPreKey = await getActiveSignedPreKey(deviceId);

      const isSetupLocal = !!identityKey && !!signedPreKey;

      if (isSetupLocal && user) {
        try {
          const res = await encryptionService.checkActiveKeys(user.id, deviceId);
          if (res.success && res.data && !res.data.has_active_keys) {
            await clearAllCryptoData();
            return { isSetup: false, deviceId };
          }
        } catch (error) {
          console.error('Failed to verify active keys with server:', error);
        }
      }

      return {
        isSetup: isSetupLocal,
        deviceId,
      };
    },
    enabled: !!user,
    staleTime: Infinity,
    retry: false,
  });

  return {
    isSetup: query.data?.isSetup ?? false,
    deviceId: query.data?.deviceId ?? null,
    isLoading: query.isLoading,
    error: query.error,
  };
}
