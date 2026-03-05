
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
  KeyPair,
  IdentityKeyPair,
  encryptKeyBackup,
  decryptKeyBackup,
  PreKeyBundle,
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
import { base64ToUtf8 } from '@/lib/base64';

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

  return useMutation({
    mutationFn: async ({ password, userId, deviceId }: { password: string; userId: string; deviceId: string }) => {
      if (!userId) {
        throw new Error('User ID is required');
      }

      if (!password) {
        throw new Error('Password is required to encrypt the key backup');
      }

      await initCrypto();

      const identityKeyPair = await generateIdentityKeyPair();
      await storeIdentityKey(deviceId, identityKeyPair);

      const signedPreKey = await generateSignedPreKey(identityKeyPair, 1);
      await storeSignedPreKey(deviceId, signedPreKey);

      const oneTimePreKeys = await generateOneTimePreKeys(1, PREKEY_BATCH_SIZE);
      await storeOneTimePreKeys(deviceId, oneTimePreKeys);

      const setupResult = await encryptionService.setupEncryption({
        user_id: userId,
        device_id: deviceId,
        identity_key: keyToBase64(identityKeyPair.signing.publicKey),
        signed_prekey: {
          key_id: signedPreKey.keyId,
          public_key: keyToBase64(signedPreKey.publicKey),
          signature: keyToBase64(signedPreKey.signature),
        },
        one_time_keys: oneTimePreKeys.map((k) => ({
          user_id: userId,
          device_id: deviceId,
          key_id: k.keyId,
          public_key: keyToBase64(k.keyPair.publicKey),
        })),
      });

      if (!setupResult.success) {
        throw new Error(`Encryption setup failed: ${setupResult.error || 'unknown error'}`);
      }

      const backupPlaintext = JSON.stringify({
        identityKey: keyToBase64(identityKeyPair.signing.publicKey),
        identityPrivateKey: keyToBase64(identityKeyPair.signing.privateKey),
        exchangePublicKey: keyToBase64(identityKeyPair.exchange.publicKey),
        exchangePrivateKey: keyToBase64(identityKeyPair.exchange.privateKey),
        deviceId: deviceId,
      });

      const encryptedBackup = await encryptKeyBackup(backupPlaintext, password);

      const backupResult = await encryptionService.uploadKeyBackup({
        device_id: deviceId,
        backup_data: encryptedBackup.ciphertextBase64,
        nonce: encryptedBackup.nonceBase64,
        salt: encryptedBackup.saltBase64,
      });

      if (!backupResult.success) {
        console.error('Key backup failed, but encryption setup succeeded', backupResult.error);
        // We do not throw here to allow them to still use the app.
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
        console.error('[Encryption] User not authenticated in useEstablishSession');
        throw new Error('User not authenticated');
      }

      console.log(`[Encryption] Establishing session with recipientUserId=${recipientUserId}, recipientDeviceId=${recipientDeviceId}`);
      await initCrypto();

      const deviceId = getStableDeviceId();

      const existingSession = await getSession(recipientUserId, recipientDeviceId);
      if (existingSession) {
        console.log(`[Encryption] Session already exists for recipientDeviceId=${recipientDeviceId}`);
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

      console.log(`[Encryption] Fetched Key Bundle for recipientDeviceId=${recipientDeviceId}`, bundleResponse.data);
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

      console.log(`[Encryption] Generating ephemeral key pair and running X3DH initiator`);
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

      console.log(`[Encryption] Successfully established new session for recipientDeviceId=${recipientDeviceId}`);
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
      console.log(`[Encryption] Encrypting message for recipientUserId=${recipientUserId}, recipientDeviceId=${recipientDeviceId}`);
      await initCrypto();

      let session = await getSession(recipientUserId, recipientDeviceId);
      let ephemeralPublicKey: Uint8Array | undefined;
      let usedOneTimePreKeyId: number | undefined;

      if (!session) {
        console.log(`[Encryption] No existing session for encryption, establishing new session`);
        const result = await establishSession.mutateAsync({
          recipientUserId,
          recipientDeviceId,
        });
        session = result.session;
        ephemeralPublicKey = result.ephemeralPublicKey;
        usedOneTimePreKeyId = result.usedOneTimePreKeyId;
      }

      console.log(`[Encryption] Running encryptMessage with session`);
      const { encrypted, updatedSession } = await encryptMessage(session, plaintext);

      await storeSession(recipientUserId, recipientDeviceId, updatedSession);

      const encryptedContent = serializeEncryptedMessage(encrypted);
      console.log(`[Encryption] Successfully encrypted message for recipientDeviceId=${recipientDeviceId}`);

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
        console.error('[Encryption] User not authenticated in useDecryptMessageMutation');
        throw new Error('User not authenticated');
      }

      console.log(`[Encryption] DecryptMessageMutation started for senderUserId=${senderUserId}, senderDeviceId=${senderDeviceId}`);
      console.log(`[Encryption] Decrypt params: ephemeralPublicKey=${ephemeralPublicKey}, usedOneTimePreKeyId=${usedOneTimePreKeyId}`);

      await initCrypto();

      const deviceId = getStableDeviceId();
      let session = await getSession(senderUserId, senderDeviceId);

      if (!session && ephemeralPublicKey) {
        console.log(`[Encryption] No existing session found for decryption, running X3DH responder`);
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
          console.error(`[Encryption] Failed to fetch sender identity key from server`);
          throw new Error('Failed to fetch sender identity key');
        }

        console.log(`[Encryption] Fetched sender identity key, computing X3DH keys`);
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
        console.log(`[Encryption] Session established as responder and stored`);
      }

      if (!session) {
        console.error(`[Encryption] No session found and cannot establish one for senderDeviceId=${senderDeviceId}`);
        throw new Error('No session found and cannot establish one');
      }

      console.log(`[Encryption] Running decryptMessage with deserializeEncryptedMessage`);
      const encrypted = deserializeEncryptedMessage(encryptedContent);
      const { plaintext, updatedSession } = await decryptMessage(session, encrypted);

      await storeSession(senderUserId, senderDeviceId, updatedSession);
      console.log(`[Encryption] Successfully decrypted message from senderDeviceId=${senderDeviceId}`);

      return plaintext;
    },
  });
}

export function useDecryptCiphertext() {
  const decryptMutation = useDecryptMessageMutation();
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
        rawCiphertext = base64ToUtf8(ciphertext);
      } catch {
        rawCiphertext = ciphertext;
      }

      console.log(`[Encryption] decryptCiphertext invoked for senderDeviceId=${senderDeviceId}`);

      const maybeJson = rawCiphertext.trim();
      const hasEncryptedPayload = maybeJson.startsWith('{') && maybeJson.includes('ratchetKey');
      if (!hasEncryptedPayload) {
        console.log(`[Encryption] Received message without ratchetKey payload (fallback plaintext) from senderDeviceId=${senderDeviceId}`);
        return rawCiphertext;
      }

      let parsedHeader: Record<string, unknown> = {};
      if (typeof header === 'string' && header.trim()) {
        try {
          parsedHeader = JSON.parse(header) as Record<string, unknown>;
          console.log(`[Encryption] Parsed header from string: ${JSON.stringify(parsedHeader)}`);
        } catch {
          console.warn(`[Encryption] Failed to parse header string: ${header}`);
          parsedHeader = {};
        }
      } else if (header && typeof header === 'object') {
        parsedHeader = header as Record<string, unknown>;
        console.log(`[Encryption] Using header object directly: ${JSON.stringify(parsedHeader)}`);
      } else {
        console.log(`[Encryption] No header provided or invalid header type.`);
      }

      const ephemeralKey = parsedHeader.ephemeral_key;
      const usedOneTimePreKeyId = parsedHeader.one_time_pre_key_id;

      console.log(`[Encryption] Calling mutateRef to decrypt message payload from senderDeviceId=${senderDeviceId}`);
      return mutateRef.current({
        senderUserId,
        senderDeviceId,
        encryptedContent: rawCiphertext,
        ephemeralPublicKey: typeof ephemeralKey === 'string' ? ephemeralKey : undefined,
        usedOneTimePreKeyId: typeof usedOneTimePreKeyId === 'number' ? usedOneTimePreKeyId : undefined,
      });
    },
    []
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

export function useRecoverKeys() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ password, userId, predefinedDeviceId }: { password: string; userId: string; predefinedDeviceId?: string }) => {
      await initCrypto();

      const backupResponse = await encryptionService.getKeyBackup();
      if (!backupResponse.success || !backupResponse.data) {
        throw new Error('No key backup found on server.');
      }

      let plaintext = '';
      try {
        plaintext = await decryptKeyBackup({
          ciphertextBase64: backupResponse.data.backup_data,
          nonceBase64: backupResponse.data.nonce,
          saltBase64: backupResponse.data.salt
        }, password);
      } catch (e) {
        throw new Error('Incorrect password or corrupted backup.');
      }

      const parsed = JSON.parse(plaintext);

      const identityKeyPair: IdentityKeyPair = {
        signing: {
          publicKey: base64ToKey(parsed.identityKey),
          privateKey: base64ToKey(parsed.identityPrivateKey)
        },
        exchange: {
          publicKey: base64ToKey(parsed.exchangePublicKey),
          privateKey: base64ToKey(parsed.exchangePrivateKey)
        }
      };

      const deviceId = predefinedDeviceId || getStableDeviceId();
      await storeIdentityKey(deviceId, identityKeyPair);

      const signedPreKey = await generateSignedPreKey(identityKeyPair, 1);
      await storeSignedPreKey(deviceId, signedPreKey);

      const oneTimePreKeys = await generateOneTimePreKeys(1, PREKEY_BATCH_SIZE);
      await storeOneTimePreKeys(deviceId, oneTimePreKeys);

      const setupResult = await encryptionService.setupEncryption({
        user_id: userId,
        device_id: deviceId,
        identity_key: parsed.identityKey,
        signed_prekey: {
          key_id: signedPreKey.keyId,
          public_key: keyToBase64(signedPreKey.publicKey),
          signature: keyToBase64(signedPreKey.signature),
        },
        one_time_keys: oneTimePreKeys.map((k) => ({
          user_id: userId,
          device_id: deviceId,
          key_id: k.keyId,
          public_key: keyToBase64(k.keyPair.publicKey),
        })),
      });

      if (!setupResult.success) {
        throw new Error(`Failed to restore keys to server: ${setupResult.error}`);
      }

      return { success: true, deviceId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['encryption'] });
    },
  });
}
