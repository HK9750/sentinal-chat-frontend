'use client';

import { useState, useCallback } from 'react';
import { Shield, Key, CheckCircle2, AlertCircle, Loader2, Lock } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  useUploadIdentityKey,
  useUploadSignedPreKey,
  useUploadOneTimePreKeys,
} from '@/queries/use-encryption-queries';
import { useAuthStore } from '@/stores/auth-store';
import { cn } from '@/lib/utils';

// Number of one-time prekeys to generate initially
const INITIAL_PREKEY_COUNT = 100;

type SetupStep = 'idle' | 'generating' | 'uploading' | 'complete' | 'error';

interface KeyGenerationState {
  identityKeyPair: CryptoKeyPair | null;
  signedPreKeyPair: CryptoKeyPair | null;
  signedPreKeyId: number;
  signedPreKeySignature: ArrayBuffer | null;
  oneTimePreKeys: Array<{ keyId: number; keyPair: CryptoKeyPair }>;
}

interface EncryptionSetupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: () => void;
  deviceId: string;
}

/**
 * Converts an ArrayBuffer to a base64 string
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Generates an X25519 key pair for key exchange (simulated with ECDH P-256)
 * Note: In production, use libsodium or similar for actual X25519
 */
async function generateKeyPair(): Promise<CryptoKeyPair> {
  return crypto.subtle.generateKey(
    {
      name: 'ECDH',
      namedCurve: 'P-256',
    },
    true,
    ['deriveBits']
  );
}

/**
 * Generates a signing key pair for signatures (ECDSA P-256)
 * Note: In production, use Ed25519 for Signal Protocol
 */
async function generateSigningKeyPair(): Promise<CryptoKeyPair> {
  return crypto.subtle.generateKey(
    {
      name: 'ECDSA',
      namedCurve: 'P-256',
    },
    true,
    ['sign', 'verify']
  );
}

/**
 * Exports a public key to base64 format
 */
async function exportPublicKey(key: CryptoKey): Promise<string> {
  const exported = await crypto.subtle.exportKey('spki', key);
  return arrayBufferToBase64(exported);
}

/**
 * Signs data with a private key
 */
async function signData(privateKey: CryptoKey, data: ArrayBuffer): Promise<ArrayBuffer> {
  return crypto.subtle.sign(
    {
      name: 'ECDSA',
      hash: { name: 'SHA-256' },
    },
    privateKey,
    data
  );
}

export function EncryptionSetup({
  open,
  onOpenChange,
  onComplete,
  deviceId,
}: EncryptionSetupProps) {
  const user = useAuthStore((state) => state.user);
  const [step, setStep] = useState<SetupStep>('idle');
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState({ current: 0, total: 3 });

  const uploadIdentityKey = useUploadIdentityKey();
  const uploadSignedPreKey = useUploadSignedPreKey();
  const uploadOneTimePreKeys = useUploadOneTimePreKeys();

  const [keyState, setKeyState] = useState<KeyGenerationState>({
    identityKeyPair: null,
    signedPreKeyPair: null,
    signedPreKeyId: 1,
    signedPreKeySignature: null,
    oneTimePreKeys: [],
  });

  /**
   * Generate all required keys for the Signal Protocol X3DH
   */
  const generateKeys = useCallback(async () => {
    setStep('generating');
    setError(null);
    setProgress({ current: 0, total: 3 });

    try {
      // Step 1: Generate identity key pair (long-term)
      setProgress({ current: 1, total: 3 });
      const identityKeyPair = await generateSigningKeyPair();

      // Step 2: Generate signed prekey (medium-term, rotated periodically)
      setProgress({ current: 2, total: 3 });
      const signedPreKeyPair = await generateKeyPair();
      const signedPreKeyId = Math.floor(Date.now() / 1000); // Use timestamp as key ID

      // Sign the signed prekey's public key with identity private key
      const signedPreKeyPublicRaw = await crypto.subtle.exportKey(
        'spki',
        signedPreKeyPair.publicKey
      );
      const signature = await signData(identityKeyPair.privateKey, signedPreKeyPublicRaw);

      // Step 3: Generate batch of one-time prekeys
      setProgress({ current: 3, total: 3 });
      const oneTimePreKeys: Array<{ keyId: number; keyPair: CryptoKeyPair }> = [];
      for (let i = 0; i < INITIAL_PREKEY_COUNT; i++) {
        const keyPair = await generateKeyPair();
        oneTimePreKeys.push({
          keyId: signedPreKeyId + i + 1,
          keyPair,
        });
      }

      setKeyState({
        identityKeyPair,
        signedPreKeyPair,
        signedPreKeyId,
        signedPreKeySignature: signature,
        oneTimePreKeys,
      });

      return {
        identityKeyPair,
        signedPreKeyPair,
        signedPreKeyId,
        signedPreKeySignature: signature,
        oneTimePreKeys,
      };
    } catch (err) {
      console.error('Key generation failed:', err);
      setError('Failed to generate encryption keys. Please try again.');
      setStep('error');
      throw err;
    }
  }, []);

  /**
   * Upload all generated keys to the server
   */
  const uploadKeys = useCallback(
    async (keys: KeyGenerationState) => {
      if (!user) {
        setError('User not authenticated');
        setStep('error');
        return;
      }

      setStep('uploading');
      setProgress({ current: 0, total: 3 });

      try {
        // Upload identity key
        setProgress({ current: 1, total: 3 });
        const identityPublicKey = await exportPublicKey(keys.identityKeyPair!.publicKey);
        await uploadIdentityKey.mutateAsync({
          user_id: user.id,
          device_id: deviceId,
          public_key: identityPublicKey,
        });

        // Upload signed prekey
        setProgress({ current: 2, total: 3 });
        const signedPreKeyPublic = await exportPublicKey(keys.signedPreKeyPair!.publicKey);
        await uploadSignedPreKey.mutateAsync({
          user_id: user.id,
          device_id: deviceId,
          key_id: keys.signedPreKeyId,
          public_key: signedPreKeyPublic,
          signature: arrayBufferToBase64(keys.signedPreKeySignature!),
        });

        // Upload one-time prekeys
        setProgress({ current: 3, total: 3 });
        const oneTimeKeyData = await Promise.all(
          keys.oneTimePreKeys.map(async ({ keyId, keyPair }) => ({
            user_id: user.id,
            device_id: deviceId,
            key_id: keyId,
            public_key: await exportPublicKey(keyPair.publicKey),
          }))
        );
        await uploadOneTimePreKeys.mutateAsync({ keys: oneTimeKeyData });

        // Store private keys securely in IndexedDB
        await storePrivateKeys(user.id, deviceId, keys);

        setStep('complete');
      } catch (err) {
        console.error('Key upload failed:', err);
        setError('Failed to upload encryption keys. Please try again.');
        setStep('error');
        throw err;
      }
    },
    [user, deviceId, uploadIdentityKey, uploadSignedPreKey, uploadOneTimePreKeys]
  );

  /**
   * Store private keys in IndexedDB for later use
   */
  const storePrivateKeys = async (
    userId: string,
    deviceId: string,
    keys: KeyGenerationState
  ): Promise<void> => {
    // Export private keys to JWK format for storage
    const identityPrivateJwk = await crypto.subtle.exportKey(
      'jwk',
      keys.identityKeyPair!.privateKey
    );
    const signedPreKeyPrivateJwk = await crypto.subtle.exportKey(
      'jwk',
      keys.signedPreKeyPair!.privateKey
    );

    const oneTimePrivateJwks = await Promise.all(
      keys.oneTimePreKeys.map(async ({ keyId, keyPair }) => ({
        keyId,
        privateKey: await crypto.subtle.exportKey('jwk', keyPair.privateKey),
      }))
    );

    // Store in IndexedDB
    const dbRequest = indexedDB.open('sentinel-encryption', 1);

    dbRequest.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('keys')) {
        db.createObjectStore('keys', { keyPath: 'id' });
      }
    };

    return new Promise((resolve, reject) => {
      dbRequest.onsuccess = () => {
        const db = dbRequest.result;
        const tx = db.transaction('keys', 'readwrite');
        const store = tx.objectStore('keys');

        const keyData = {
          id: `${userId}:${deviceId}`,
          identityPrivateKey: identityPrivateJwk,
          signedPreKey: {
            keyId: keys.signedPreKeyId,
            privateKey: signedPreKeyPrivateJwk,
          },
          oneTimePreKeys: oneTimePrivateJwks,
          createdAt: new Date().toISOString(),
        };

        const putRequest = store.put(keyData);
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(putRequest.error);
      };

      dbRequest.onerror = () => reject(dbRequest.error);
    });
  };

  /**
   * Handle the full setup flow
   */
  const handleSetup = useCallback(async () => {
    try {
      const keys = await generateKeys();
      await uploadKeys(keys);
      onComplete?.();
    } catch {
      // Error already handled in individual functions
    }
  }, [generateKeys, uploadKeys, onComplete]);

  /**
   * Reset and close the dialog
   */
  const handleClose = useCallback(() => {
    if (step === 'complete') {
      onOpenChange(false);
    }
  }, [step, onOpenChange]);

  const isProcessing = step === 'generating' || step === 'uploading';

  return (
    <Dialog open={open} onOpenChange={step === 'complete' ? onOpenChange : undefined}>
      <DialogContent
        showCloseButton={step === 'complete' || step === 'error'}
        className="bg-slate-900/95 border-slate-700 backdrop-blur-xl sm:max-w-lg"
      >
        <DialogHeader className="items-center space-y-4">
          <div
            className={cn(
              'flex h-16 w-16 items-center justify-center rounded-full',
              step === 'complete' && 'bg-emerald-500/20',
              step === 'error' && 'bg-red-500/20',
              (step === 'idle' || isProcessing) && 'bg-blue-500/20'
            )}
          >
            {step === 'complete' ? (
              <CheckCircle2 className="h-8 w-8 text-emerald-500" />
            ) : step === 'error' ? (
              <AlertCircle className="h-8 w-8 text-red-500" />
            ) : isProcessing ? (
              <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
            ) : (
              <Shield className="h-8 w-8 text-blue-500" />
            )}
          </div>
          <div className="text-center">
            <DialogTitle className="text-xl text-slate-100">
              {step === 'complete'
                ? 'Encryption Ready'
                : step === 'error'
                  ? 'Setup Failed'
                  : 'Set Up End-to-End Encryption'}
            </DialogTitle>
            <DialogDescription className="text-slate-400 mt-2">
              {step === 'complete'
                ? 'Your messages are now protected with end-to-end encryption.'
                : step === 'error'
                  ? error || 'An error occurred during setup.'
                  : 'Generate secure encryption keys to protect your messages.'}
            </DialogDescription>
          </div>
        </DialogHeader>

        {/* Progress indicator */}
        {isProcessing && (
          <div className="py-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium',
                    progress.current >= 1
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-700 text-slate-400'
                  )}
                >
                  {progress.current > 1 ? <CheckCircle2 className="h-4 w-4" /> : '1'}
                </div>
                <span className="text-sm text-slate-300">
                  {step === 'generating' ? 'Generate identity key' : 'Upload identity key'}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium',
                    progress.current >= 2
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-700 text-slate-400'
                  )}
                >
                  {progress.current > 2 ? <CheckCircle2 className="h-4 w-4" /> : '2'}
                </div>
                <span className="text-sm text-slate-300">
                  {step === 'generating' ? 'Generate signed prekey' : 'Upload signed prekey'}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium',
                    progress.current >= 3
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-700 text-slate-400'
                  )}
                >
                  {progress.current > 3 ? <CheckCircle2 className="h-4 w-4" /> : '3'}
                </div>
                <span className="text-sm text-slate-300">
                  {step === 'generating'
                    ? `Generate ${INITIAL_PREKEY_COUNT} one-time prekeys`
                    : `Upload ${INITIAL_PREKEY_COUNT} one-time prekeys`}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Idle state - explanation */}
        {step === 'idle' && (
          <div className="py-4 space-y-4">
            <Card className="bg-slate-800/50 border-slate-700 p-4">
              <div className="flex gap-3">
                <Key className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-slate-200">Identity Key</p>
                  <p className="text-xs text-slate-400">
                    A long-term key that identifies you on this device
                  </p>
                </div>
              </div>
            </Card>
            <Card className="bg-slate-800/50 border-slate-700 p-4">
              <div className="flex gap-3">
                <Lock className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-slate-200">Signed Prekey</p>
                  <p className="text-xs text-slate-400">
                    A medium-term key signed by your identity key for verification
                  </p>
                </div>
              </div>
            </Card>
            <Card className="bg-slate-800/50 border-slate-700 p-4">
              <div className="flex gap-3">
                <Shield className="h-5 w-5 text-purple-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-slate-200">One-Time Prekeys</p>
                  <p className="text-xs text-slate-400">
                    {INITIAL_PREKEY_COUNT} single-use keys for establishing new secure sessions
                  </p>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Complete state */}
        {step === 'complete' && (
          <div className="py-4">
            <Card className="bg-emerald-500/10 border-emerald-500/30 p-4">
              <div className="flex gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-slate-200">Keys Generated & Uploaded</p>
                  <p className="text-xs text-slate-400">
                    Your private keys are stored securely on this device. Public keys have been
                    uploaded to enable encrypted messaging.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex justify-end gap-3 pt-4">
          {step === 'idle' && (
            <>
              <Button
                variant="ghost"
                onClick={() => onOpenChange(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                Later
              </Button>
              <Button
                onClick={handleSetup}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Shield className="h-4 w-4 mr-2" />
                Generate Keys
              </Button>
            </>
          )}
          {step === 'error' && (
            <>
              <Button
                variant="ghost"
                onClick={() => onOpenChange(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                Cancel
              </Button>
              <Button onClick={handleSetup} className="bg-blue-600 hover:bg-blue-700">
                Try Again
              </Button>
            </>
          )}
          {step === 'complete' && (
            <Button onClick={handleClose} className="bg-emerald-600 hover:bg-emerald-700">
              Done
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
