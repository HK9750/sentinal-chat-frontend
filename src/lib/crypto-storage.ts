/**
 * IndexedDB Storage for Encryption Keys and Sessions
 *
 * Stores private keys and Double Ratchet session state locally.
 * All keys are stored encrypted when possible.
 */

import {
  IdentityKeyPair,
  SignedKeyPair,
  KeyPair,
  SessionState,
  serializeSession,
  deserializeSession,
  keyToBase64,
  base64ToKey,
} from './crypto';

const DB_NAME = 'sentinel-crypto';
const DB_VERSION = 1;

// Store names
const STORES = {
  IDENTITY_KEYS: 'identityKeys',
  SIGNED_PRE_KEYS: 'signedPreKeys',
  ONE_TIME_PRE_KEYS: 'oneTimePreKeys',
  SESSIONS: 'sessions',
  METADATA: 'metadata',
} as const;

// ============================================================================
// Types
// ============================================================================

export interface StoredIdentityKey {
  deviceId: string;
  signingPublicKey: string;
  signingPrivateKey: string;
  exchangePublicKey: string;
  exchangePrivateKey: string;
  createdAt: number;
}

export interface StoredSignedPreKey {
  keyId: number;
  deviceId: string;
  publicKey: string;
  privateKey: string;
  signature: string;
  createdAt: number;
  isActive: boolean;
}

export interface StoredOneTimePreKey {
  keyId: number;
  deviceId: string;
  publicKey: string;
  privateKey: string;
  createdAt: number;
  isConsumed: boolean;
}

export interface StoredSession {
  recipientUserId: string;
  recipientDeviceId: string;
  sessionData: string; // Serialized SessionState
  createdAt: number;
  updatedAt: number;
}

export interface CryptoMetadata {
  key: string;
  value: string;
}

// ============================================================================
// Database Initialization
// ============================================================================

let dbInstance: IDBDatabase | null = null;

function openDatabase(): Promise<IDBDatabase> {
  if (dbInstance) {
    return Promise.resolve(dbInstance);
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error('Failed to open crypto database'));
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Identity keys store (one per device)
      if (!db.objectStoreNames.contains(STORES.IDENTITY_KEYS)) {
        db.createObjectStore(STORES.IDENTITY_KEYS, { keyPath: 'deviceId' });
      }

      // Signed pre-keys store
      if (!db.objectStoreNames.contains(STORES.SIGNED_PRE_KEYS)) {
        const signedPreKeyStore = db.createObjectStore(STORES.SIGNED_PRE_KEYS, {
          keyPath: 'keyId',
        });
        signedPreKeyStore.createIndex('deviceId', 'deviceId', { unique: false });
        signedPreKeyStore.createIndex('isActive', 'isActive', { unique: false });
      }

      // One-time pre-keys store
      if (!db.objectStoreNames.contains(STORES.ONE_TIME_PRE_KEYS)) {
        const oneTimePreKeyStore = db.createObjectStore(STORES.ONE_TIME_PRE_KEYS, {
          keyPath: 'keyId',
        });
        oneTimePreKeyStore.createIndex('deviceId', 'deviceId', { unique: false });
        oneTimePreKeyStore.createIndex('isConsumed', 'isConsumed', { unique: false });
      }

      // Sessions store (keyed by recipient user+device)
      if (!db.objectStoreNames.contains(STORES.SESSIONS)) {
        const sessionStore = db.createObjectStore(STORES.SESSIONS, {
          keyPath: ['recipientUserId', 'recipientDeviceId'],
        });
        sessionStore.createIndex('recipientUserId', 'recipientUserId', { unique: false });
      }

      // Metadata store (for misc settings like next key IDs)
      if (!db.objectStoreNames.contains(STORES.METADATA)) {
        db.createObjectStore(STORES.METADATA, { keyPath: 'key' });
      }
    };
  });
}

// ============================================================================
// Identity Key Operations
// ============================================================================

export async function storeIdentityKey(
  deviceId: string,
  keyPair: IdentityKeyPair
): Promise<void> {
  const db = await openDatabase();

  const stored: StoredIdentityKey = {
    deviceId,
    signingPublicKey: keyToBase64(keyPair.signing.publicKey),
    signingPrivateKey: keyToBase64(keyPair.signing.privateKey),
    exchangePublicKey: keyToBase64(keyPair.exchange.publicKey),
    exchangePrivateKey: keyToBase64(keyPair.exchange.privateKey),
    createdAt: Date.now(),
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.IDENTITY_KEYS, 'readwrite');
    const store = tx.objectStore(STORES.IDENTITY_KEYS);
    const request = store.put(stored);

    request.onerror = () => reject(new Error('Failed to store identity key'));
    request.onsuccess = () => resolve();
  });
}

export async function getIdentityKey(deviceId: string): Promise<IdentityKeyPair | null> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.IDENTITY_KEYS, 'readonly');
    const store = tx.objectStore(STORES.IDENTITY_KEYS);
    const request = store.get(deviceId);

    request.onerror = () => reject(new Error('Failed to get identity key'));
    request.onsuccess = () => {
      const stored = request.result as StoredIdentityKey | undefined;
      if (!stored) {
        resolve(null);
        return;
      }

      resolve({
        signing: {
          publicKey: base64ToKey(stored.signingPublicKey),
          privateKey: base64ToKey(stored.signingPrivateKey),
        },
        exchange: {
          publicKey: base64ToKey(stored.exchangePublicKey),
          privateKey: base64ToKey(stored.exchangePrivateKey),
        },
      });
    };
  });
}

export async function deleteIdentityKey(deviceId: string): Promise<void> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.IDENTITY_KEYS, 'readwrite');
    const store = tx.objectStore(STORES.IDENTITY_KEYS);
    const request = store.delete(deviceId);

    request.onerror = () => reject(new Error('Failed to delete identity key'));
    request.onsuccess = () => resolve();
  });
}

// ============================================================================
// Signed Pre-Key Operations
// ============================================================================

export async function storeSignedPreKey(
  deviceId: string,
  signedKey: SignedKeyPair
): Promise<void> {
  const db = await openDatabase();

  // Deactivate all other signed pre-keys for this device
  await deactivateAllSignedPreKeys(deviceId);

  const stored: StoredSignedPreKey = {
    keyId: signedKey.keyId,
    deviceId,
    publicKey: keyToBase64(signedKey.publicKey),
    privateKey: keyToBase64(signedKey.privateKey),
    signature: keyToBase64(signedKey.signature),
    createdAt: Date.now(),
    isActive: true,
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.SIGNED_PRE_KEYS, 'readwrite');
    const store = tx.objectStore(STORES.SIGNED_PRE_KEYS);
    const request = store.put(stored);

    request.onerror = () => reject(new Error('Failed to store signed pre-key'));
    request.onsuccess = () => resolve();
  });
}

export async function getSignedPreKey(keyId: number): Promise<SignedKeyPair | null> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.SIGNED_PRE_KEYS, 'readonly');
    const store = tx.objectStore(STORES.SIGNED_PRE_KEYS);
    const request = store.get(keyId);

    request.onerror = () => reject(new Error('Failed to get signed pre-key'));
    request.onsuccess = () => {
      const stored = request.result as StoredSignedPreKey | undefined;
      if (!stored) {
        resolve(null);
        return;
      }

      resolve({
        keyId: stored.keyId,
        publicKey: base64ToKey(stored.publicKey),
        privateKey: base64ToKey(stored.privateKey),
        signature: base64ToKey(stored.signature),
      });
    };
  });
}

export async function getActiveSignedPreKey(deviceId: string): Promise<SignedKeyPair | null> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.SIGNED_PRE_KEYS, 'readonly');
    const store = tx.objectStore(STORES.SIGNED_PRE_KEYS);
    const index = store.index('deviceId');
    const request = index.getAll(deviceId);

    request.onerror = () => reject(new Error('Failed to get active signed pre-key'));
    request.onsuccess = () => {
      const keys = request.result as StoredSignedPreKey[];
      const activeKey = keys.find((k) => k.isActive);
      if (!activeKey) {
        resolve(null);
        return;
      }

      resolve({
        keyId: activeKey.keyId,
        publicKey: base64ToKey(activeKey.publicKey),
        privateKey: base64ToKey(activeKey.privateKey),
        signature: base64ToKey(activeKey.signature),
      });
    };
  });
}

async function deactivateAllSignedPreKeys(deviceId: string): Promise<void> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.SIGNED_PRE_KEYS, 'readwrite');
    const store = tx.objectStore(STORES.SIGNED_PRE_KEYS);
    const index = store.index('deviceId');
    const request = index.openCursor(deviceId);

    request.onerror = () => reject(new Error('Failed to deactivate signed pre-keys'));
    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor) {
        const key = cursor.value as StoredSignedPreKey;
        key.isActive = false;
        cursor.update(key);
        cursor.continue();
      } else {
        resolve();
      }
    };
  });
}

// ============================================================================
// One-Time Pre-Key Operations
// ============================================================================

export async function storeOneTimePreKeys(
  deviceId: string,
  keys: Array<{ keyId: number; keyPair: KeyPair }>
): Promise<void> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.ONE_TIME_PRE_KEYS, 'readwrite');
    const store = tx.objectStore(STORES.ONE_TIME_PRE_KEYS);

    let completed = 0;
    let hasError = false;

    for (const key of keys) {
      const stored: StoredOneTimePreKey = {
        keyId: key.keyId,
        deviceId,
        publicKey: keyToBase64(key.keyPair.publicKey),
        privateKey: keyToBase64(key.keyPair.privateKey),
        createdAt: Date.now(),
        isConsumed: false,
      };

      const request = store.put(stored);
      request.onerror = () => {
        hasError = true;
        reject(new Error('Failed to store one-time pre-key'));
      };
      request.onsuccess = () => {
        completed++;
        if (completed === keys.length && !hasError) {
          resolve();
        }
      };
    }

    if (keys.length === 0) {
      resolve();
    }
  });
}

export async function getOneTimePreKey(keyId: number): Promise<KeyPair | null> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.ONE_TIME_PRE_KEYS, 'readonly');
    const store = tx.objectStore(STORES.ONE_TIME_PRE_KEYS);
    const request = store.get(keyId);

    request.onerror = () => reject(new Error('Failed to get one-time pre-key'));
    request.onsuccess = () => {
      const stored = request.result as StoredOneTimePreKey | undefined;
      if (!stored) {
        resolve(null);
        return;
      }

      resolve({
        publicKey: base64ToKey(stored.publicKey),
        privateKey: base64ToKey(stored.privateKey),
      });
    };
  });
}

export async function markOneTimePreKeyConsumed(keyId: number): Promise<void> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.ONE_TIME_PRE_KEYS, 'readwrite');
    const store = tx.objectStore(STORES.ONE_TIME_PRE_KEYS);
    const request = store.get(keyId);

    request.onerror = () => reject(new Error('Failed to mark one-time pre-key consumed'));
    request.onsuccess = () => {
      const stored = request.result as StoredOneTimePreKey | undefined;
      if (stored) {
        stored.isConsumed = true;
        store.put(stored);
      }
      resolve();
    };
  });
}

export async function getUnconsumedOneTimePreKeyCount(deviceId: string): Promise<number> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.ONE_TIME_PRE_KEYS, 'readonly');
    const store = tx.objectStore(STORES.ONE_TIME_PRE_KEYS);
    const index = store.index('deviceId');
    const request = index.getAll(deviceId);

    request.onerror = () => reject(new Error('Failed to count one-time pre-keys'));
    request.onsuccess = () => {
      const keys = request.result as StoredOneTimePreKey[];
      const unconsumed = keys.filter((k) => !k.isConsumed);
      resolve(unconsumed.length);
    };
  });
}

export async function getNextOneTimePreKeyId(deviceId: string): Promise<number> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.ONE_TIME_PRE_KEYS, 'readonly');
    const store = tx.objectStore(STORES.ONE_TIME_PRE_KEYS);
    const index = store.index('deviceId');
    const request = index.getAll(deviceId);

    request.onerror = () => reject(new Error('Failed to get next key ID'));
    request.onsuccess = () => {
      const keys = request.result as StoredOneTimePreKey[];
      if (keys.length === 0) {
        resolve(1);
        return;
      }
      const maxKeyId = Math.max(...keys.map((k) => k.keyId));
      resolve(maxKeyId + 1);
    };
  });
}

// ============================================================================
// Session Operations
// ============================================================================

export async function storeSession(
  recipientUserId: string,
  recipientDeviceId: string,
  session: SessionState
): Promise<void> {
  const db = await openDatabase();

  const existing = await getStoredSession(recipientUserId, recipientDeviceId);

  const stored: StoredSession = {
    recipientUserId,
    recipientDeviceId,
    sessionData: serializeSession(session),
    createdAt: existing?.createdAt ?? Date.now(),
    updatedAt: Date.now(),
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.SESSIONS, 'readwrite');
    const store = tx.objectStore(STORES.SESSIONS);
    const request = store.put(stored);

    request.onerror = () => reject(new Error('Failed to store session'));
    request.onsuccess = () => resolve();
  });
}

async function getStoredSession(
  recipientUserId: string,
  recipientDeviceId: string
): Promise<StoredSession | null> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.SESSIONS, 'readonly');
    const store = tx.objectStore(STORES.SESSIONS);
    const request = store.get([recipientUserId, recipientDeviceId]);

    request.onerror = () => reject(new Error('Failed to get stored session'));
    request.onsuccess = () => {
      resolve(request.result as StoredSession | undefined ?? null);
    };
  });
}

export async function getSession(
  recipientUserId: string,
  recipientDeviceId: string
): Promise<SessionState | null> {
  const stored = await getStoredSession(recipientUserId, recipientDeviceId);
  if (!stored) {
    return null;
  }
  return deserializeSession(stored.sessionData);
}

export async function deleteSession(
  recipientUserId: string,
  recipientDeviceId: string
): Promise<void> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.SESSIONS, 'readwrite');
    const store = tx.objectStore(STORES.SESSIONS);
    const request = store.delete([recipientUserId, recipientDeviceId]);

    request.onerror = () => reject(new Error('Failed to delete session'));
    request.onsuccess = () => resolve();
  });
}

export async function getAllSessionsForUser(
  recipientUserId: string
): Promise<Array<{ deviceId: string; session: SessionState }>> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.SESSIONS, 'readonly');
    const store = tx.objectStore(STORES.SESSIONS);
    const index = store.index('recipientUserId');
    const request = index.getAll(recipientUserId);

    request.onerror = () => reject(new Error('Failed to get sessions'));
    request.onsuccess = () => {
      const sessions = request.result as StoredSession[];
      resolve(
        sessions.map((s) => ({
          deviceId: s.recipientDeviceId,
          session: deserializeSession(s.sessionData),
        }))
      );
    };
  });
}

export async function hasSession(
  recipientUserId: string,
  recipientDeviceId: string
): Promise<boolean> {
  const session = await getStoredSession(recipientUserId, recipientDeviceId);
  return session !== null;
}

// ============================================================================
// Metadata Operations
// ============================================================================

export async function setMetadata(key: string, value: string): Promise<void> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.METADATA, 'readwrite');
    const store = tx.objectStore(STORES.METADATA);
    const request = store.put({ key, value });

    request.onerror = () => reject(new Error('Failed to set metadata'));
    request.onsuccess = () => resolve();
  });
}

export async function getMetadata(key: string): Promise<string | null> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.METADATA, 'readonly');
    const store = tx.objectStore(STORES.METADATA);
    const request = store.get(key);

    request.onerror = () => reject(new Error('Failed to get metadata'));
    request.onsuccess = () => {
      const result = request.result as CryptoMetadata | undefined;
      resolve(result?.value ?? null);
    };
  });
}

// ============================================================================
// Clear All Data
// ============================================================================

export async function clearAllCryptoData(): Promise<void> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const storeNames = Object.values(STORES);
    const tx = db.transaction(storeNames, 'readwrite');

    let completed = 0;
    let hasError = false;

    for (const storeName of storeNames) {
      const store = tx.objectStore(storeName);
      const request = store.clear();

      request.onerror = () => {
        hasError = true;
        reject(new Error(`Failed to clear ${storeName}`));
      };
      request.onsuccess = () => {
        completed++;
        if (completed === storeNames.length && !hasError) {
          resolve();
        }
      };
    }
  });
}

// ============================================================================
// Device ID Management
// ============================================================================

const DEVICE_ID_KEY = 'deviceId';

export async function getOrCreateDeviceId(): Promise<string> {
  let deviceId = await getMetadata(DEVICE_ID_KEY);

  if (!deviceId) {
    // Generate a new device ID
    deviceId = crypto.randomUUID();
    await setMetadata(DEVICE_ID_KEY, deviceId);
  }

  return deviceId;
}

export async function getDeviceId(): Promise<string | null> {
  return getMetadata(DEVICE_ID_KEY);
}
