import {
  base64ToBytes,
  base64ToJson,
  base64ToString,
  bytesToBase64,
  jsonToBase64,
  stringToBase64,
} from '@/lib/base64';
import type {
  CipherEnvelope,
  ConversationAccessCode,
  DeviceKeyBundle,
  ConversationKeyRecord,
  FileEncryptionResult,
  SealedKeyEnvelope,
  SecureAssetManifest,
  StoredDeviceKeyPair,
} from '@/types';

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function getWebCrypto(): Crypto {
  if (typeof globalThis.crypto === 'undefined') {
    throw new Error('Web Crypto is unavailable in this environment.');
  }

  return globalThis.crypto;
}

function getRandomValues(length: number): Uint8Array {
  return getWebCrypto().getRandomValues(new Uint8Array(length));
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

async function importSecretKey(secret: string): Promise<CryptoKey> {
  return getWebCrypto().subtle.importKey('raw', toArrayBuffer(base64ToBytes(secret)), 'AES-GCM', false, [
    'encrypt',
    'decrypt',
  ]);
}

async function importPublicKey(publicKey: string, algorithm = 'RSA-OAEP-256'): Promise<CryptoKey> {
  const normalized = normalizeKeyAlgorithm(algorithm);

  return getWebCrypto().subtle.importKey(
    'spki',
    toArrayBuffer(base64ToBytes(publicKey)),
    normalized,
    true,
    ['encrypt']
  );
}

async function importPrivateKey(privateKey: string, algorithm = 'RSA-OAEP-256'): Promise<CryptoKey> {
  const normalized = normalizeKeyAlgorithm(algorithm);

  return getWebCrypto().subtle.importKey(
    'pkcs8',
    toArrayBuffer(base64ToBytes(privateKey)),
    normalized,
    true,
    ['decrypt']
  );
}

function normalizeKeyAlgorithm(algorithm: string): RsaHashedImportParams {
  if (algorithm === 'RSA-OAEP-256') {
    return {
      name: 'RSA-OAEP',
      hash: 'SHA-256',
    };
  }

  throw new Error(`Unsupported key algorithm: ${algorithm}`);
}

async function sha256Base64(value: Uint8Array | string): Promise<string> {
  const bytes = typeof value === 'string' ? encoder.encode(value) : value;
  const digest = await getWebCrypto().subtle.digest('SHA-256', toArrayBuffer(bytes));
  return bytesToBase64(new Uint8Array(digest));
}

function assertCipherEnvelope(value: unknown): asserts value is CipherEnvelope {
  if (
    typeof value !== 'object' ||
    value === null ||
    !('v' in value) ||
    !('alg' in value) ||
    !('iv' in value) ||
    !('ciphertext' in value)
  ) {
    throw new Error('Invalid cipher envelope.');
  }
}

export async function generateSecret(length = 32): Promise<string> {
  return bytesToBase64(getRandomValues(length));
}

export async function fingerprintSecret(secret: string): Promise<string> {
  const digest = await sha256Base64(secret);
  return digest.slice(0, 16).replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
}

export async function createConversationKeyRecord(
  conversationId: string,
  secret?: string,
  source: ConversationKeyRecord['source'] = 'generated'
): Promise<ConversationKeyRecord> {
  const now = new Date().toISOString();
  const resolvedSecret = secret ?? (await generateSecret());

  return {
    conversation_id: conversationId,
    secret: resolvedSecret,
    fingerprint: await fingerprintSecret(resolvedSecret),
    created_at: now,
    updated_at: now,
    source,
  };
}

export async function createConversationKeyRecordFromSecret(
  conversationId: string,
  secret: string,
  source: ConversationKeyRecord['source'] = 'synced',
  createdAt?: string
): Promise<ConversationKeyRecord> {
  const now = createdAt ?? new Date().toISOString();

  return {
    conversation_id: conversationId,
    secret,
    fingerprint: await fingerprintSecret(secret),
    created_at: now,
    updated_at: now,
    source,
  };
}

export async function encryptText(value: string, secret: string): Promise<CipherEnvelope> {
  return encryptBytes(encoder.encode(value), secret);
}

export async function decryptText(envelope: CipherEnvelope, secret: string): Promise<string> {
  const decrypted = await decryptBytes(base64ToBytes(envelope.ciphertext), secret, envelope.iv);
  return decoder.decode(decrypted);
}

export async function encryptBytes(bytes: Uint8Array, secret: string): Promise<CipherEnvelope> {
  const iv = getRandomValues(12);
  const key = await importSecretKey(secret);
  const ciphertext = await getWebCrypto().subtle.encrypt(
    { name: 'AES-GCM', iv: toArrayBuffer(iv) },
    key,
    toArrayBuffer(bytes)
  );

  return {
    v: 1,
    alg: 'A256GCM',
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(new Uint8Array(ciphertext)),
  };
}

export async function decryptBytes(ciphertext: Uint8Array, secret: string, iv: string): Promise<Uint8Array> {
  const key = await importSecretKey(secret);
  const decrypted = await getWebCrypto().subtle.decrypt(
    { name: 'AES-GCM', iv: toArrayBuffer(base64ToBytes(iv)) },
    key,
    toArrayBuffer(ciphertext)
  );

  return new Uint8Array(decrypted);
}

export async function encryptPayload<T>(payload: T, secret: string): Promise<string> {
  const envelope = await encryptText(JSON.stringify(payload), secret);
  return JSON.stringify(envelope);
}

export async function decryptPayload<T>(serialized: string, secret: string): Promise<T> {
  const parsed = JSON.parse(serialized) as unknown;
  assertCipherEnvelope(parsed);

  const plaintext = await decryptText(parsed, secret);
  return JSON.parse(plaintext) as T;
}

export async function generateDeviceKeyPair(): Promise<StoredDeviceKeyPair> {
  const normalized = normalizeKeyAlgorithm('RSA-OAEP-256');
  const pair = await getWebCrypto().subtle.generateKey(
    {
      name: normalized.name,
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: normalized.hash,
    },
    true,
    ['encrypt', 'decrypt']
  );

  const publicKey = bytesToBase64(new Uint8Array(await getWebCrypto().subtle.exportKey('spki', pair.publicKey)));
  const privateKey = bytesToBase64(new Uint8Array(await getWebCrypto().subtle.exportKey('pkcs8', pair.privateKey)));
  const now = new Date().toISOString();

  return {
    algorithm: 'RSA-OAEP-256',
    fingerprint: await fingerprintSecret(publicKey),
    public_key: publicKey,
    private_key: privateKey,
    created_at: now,
    updated_at: now,
  };
}

export async function sealConversationKey(secret: string, bundle: Pick<DeviceKeyBundle, 'public_key' | 'algorithm'>): Promise<SealedKeyEnvelope> {
  const publicKey = await importPublicKey(bundle.public_key, bundle.algorithm);
  const ciphertext = await getWebCrypto().subtle.encrypt(
    { name: 'RSA-OAEP' },
    publicKey,
    encoder.encode(secret)
  );

  return {
    v: 1,
    alg: bundle.algorithm,
    ciphertext: bytesToBase64(new Uint8Array(ciphertext)),
  };
}

export async function openSealedConversationKey(envelope: SealedKeyEnvelope, pair: Pick<StoredDeviceKeyPair, 'private_key'>): Promise<string> {
  const privateKey = await importPrivateKey(pair.private_key, envelope.alg);
  const decrypted = await getWebCrypto().subtle.decrypt(
    { name: 'RSA-OAEP' },
    privateKey,
    toArrayBuffer(base64ToBytes(envelope.ciphertext))
  );

  return decoder.decode(decrypted);
}

export async function encryptBinaryAsset(
  blob: Blob,
  filename: string,
  mimeType: string,
  overrides?: Partial<SecureAssetManifest>
): Promise<FileEncryptionResult> {
  const secret = await generateSecret();
  const ivBytes = getRandomValues(12);
  const key = await importSecretKey(secret);
  const plainBytes = new Uint8Array(await blob.arrayBuffer());
  const ciphertext = await getWebCrypto().subtle.encrypt(
    { name: 'AES-GCM', iv: toArrayBuffer(ivBytes) },
    key,
    toArrayBuffer(plainBytes)
  );
  const encryptedBytes = new Uint8Array(ciphertext);

  const manifest: SecureAssetManifest = {
    file_id: overrides?.file_id ?? crypto.randomUUID(),
    attachment_id: overrides?.attachment_id,
    filename,
    mime_type: mimeType,
    size_bytes: blob.size,
    key: secret,
    iv: bytesToBase64(ivBytes),
    checksum: await sha256Base64(encryptedBytes),
    duration_ms: overrides?.duration_ms,
    waveform: overrides?.waveform,
  };

  return {
    encrypted_bytes: encryptedBytes,
    manifest,
  };
}

export async function decryptBinaryAsset(blob: Blob, manifest: SecureAssetManifest): Promise<Blob> {
  const encryptedBytes = new Uint8Array(await blob.arrayBuffer());
  const decryptedBytes = await decryptBytes(encryptedBytes, manifest.key, manifest.iv);
  return new Blob([toArrayBuffer(decryptedBytes)], { type: manifest.mime_type });
}

export function createConversationAccessCode(record: ConversationKeyRecord): ConversationAccessCode {
  const code = `SNT1.${jsonToBase64({ conversation_id: record.conversation_id, secret: record.secret })}`;

  return {
    code,
    fingerprint: record.fingerprint,
  };
}

export async function parseConversationAccessCode(code: string): Promise<ConversationKeyRecord> {
  const normalized = code.trim();

  if (!normalized.startsWith('SNT1.')) {
    throw new Error('Invalid access code.');
  }

  const payload = base64ToJson<{ conversation_id: string; secret: string }>(normalized.slice(5));

  return createConversationKeyRecord(payload.conversation_id, payload.secret, 'imported');
}

export async function encryptRemoteUrl(url: string, conversationSecret: string): Promise<string> {
  return encryptPayload({ kind: 'url', url }, conversationSecret);
}

export async function decryptRemoteUrl(serialized: string, conversationSecret: string): Promise<string> {
  const payload = await decryptPayload<{ kind: 'url'; url: string }>(serialized, conversationSecret);
  return payload.url;
}

export function createRequestId(prefix = 'req'): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

export function createClientMessageId(): string {
  return `msg_${crypto.randomUUID()}`;
}

export function createVaultBackupPayload(records: ConversationKeyRecord[]): string {
  return `SNTBK1.${stringToBase64(JSON.stringify(records))}`;
}

export function parseVaultBackupPayload(value: string): ConversationKeyRecord[] {
  const normalized = value.trim();

  if (!normalized.startsWith('SNTBK1.')) {
    throw new Error('Invalid vault backup.');
  }

  return JSON.parse(base64ToString(normalized.slice(7))) as ConversationKeyRecord[];
}
