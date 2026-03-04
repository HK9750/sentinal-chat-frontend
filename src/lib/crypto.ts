
import sodium from 'libsodium-wrappers-sumo';

let sodiumReady = false;
export async function initCrypto(): Promise<void> {
  if (!sodiumReady) {
    await sodium.ready;
    sodiumReady = true;
  }
}

export interface KeyPair {
  publicKey: Uint8Array;
  privateKey: Uint8Array;
}

export interface SignedKeyPair extends KeyPair {
  keyId: number;
  signature: Uint8Array;
}

export interface IdentityKeyPair {
  signing: KeyPair;
  exchange: KeyPair;
}

export interface PreKeyBundle {
  identityKey: Uint8Array;
  signedPreKey: Uint8Array;
  signedPreKeyId: number;
  signedPreKeySignature: Uint8Array;
  oneTimePreKey?: Uint8Array;
  oneTimePreKeyId?: number;
}

export interface SessionState {
  rootKey: Uint8Array;
  sendingChainKey: Uint8Array;
  receivingChainKey: Uint8Array | null;
  ourRatchetKey: KeyPair;
  theirRatchetKey: Uint8Array | null;
  sendingChainLength: number;
  receivingChainLength: number;
  previousChains: Map<string, { chainKey: Uint8Array; length: number }>;
  skippedMessageKeys: Map<string, Uint8Array>;
  associatedData: Uint8Array;
}

export interface EncryptedMessage {
  ciphertext: Uint8Array;
  ratchetKey: Uint8Array;
  messageNumber: number;
  previousChainLength: number;
  nonce: Uint8Array;
}

const MAX_SKIP = 2000;

function buildSkippedKeyId(ratchetKey: Uint8Array, messageNumber: number): string {
  return `${sodium.to_base64(ratchetKey, sodium.base64_variants.ORIGINAL)}:${messageNumber}`;
}

function trimSkippedKeys(keys: Map<string, Uint8Array>) {
  if (keys.size <= MAX_SKIP) return;
  let toRemove = keys.size - MAX_SKIP;
  for (const key of keys.keys()) {
    keys.delete(key);
    toRemove -= 1;
    if (toRemove <= 0) break;
  }
}

function skipMessageKeys(session: SessionState, until: number): SessionState {
  if (!session.receivingChainKey || !session.theirRatchetKey) {
    return session;
  }

  if (until - session.receivingChainLength > MAX_SKIP) {
    throw new Error('Skipped message limit exceeded');
  }

  let chainKey = session.receivingChainKey;
  for (let i = session.receivingChainLength; i < until; i++) {
    const { messageKey, nextChainKey } = kdfChain(chainKey);
    session.skippedMessageKeys.set(buildSkippedKeyId(session.theirRatchetKey, i), messageKey);
    chainKey = nextChainKey;
  }

  session.receivingChainKey = chainKey;
  session.receivingChainLength = until;
  trimSkippedKeys(session.skippedMessageKeys);
  return session;
}

function ratchetStep(session: SessionState, theirRatchetKey: Uint8Array): SessionState {
  const dhOutput = sodium.crypto_scalarmult(
    session.ourRatchetKey.privateKey,
    theirRatchetKey
  );

  const { rootKey: newRootKey, chainKey: receivingChainKey } = kdfRatchet(
    session.rootKey,
    dhOutput
  );

  const newRatchetKey = sodium.crypto_box_keypair();
  const dhOutput2 = sodium.crypto_scalarmult(
    newRatchetKey.privateKey,
    theirRatchetKey
  );

  const { rootKey: finalRootKey, chainKey: sendingChainKey } = kdfRatchet(
    newRootKey,
    dhOutput2
  );

  return {
    ...session,
    rootKey: finalRootKey,
    sendingChainKey,
    receivingChainKey,
    ourRatchetKey: {
      publicKey: newRatchetKey.publicKey,
      privateKey: newRatchetKey.privateKey,
    },
    theirRatchetKey,
    sendingChainLength: 0,
    receivingChainLength: 0,
  };
}

export async function generateIdentityKeyPair(): Promise<IdentityKeyPair> {
  await initCrypto();

  const signing = sodium.crypto_sign_keypair();

  const seed = sodium.crypto_sign_ed25519_sk_to_seed(signing.privateKey);
  const exchange = sodium.crypto_box_seed_keypair(seed);

  return {
    signing: {
      publicKey: signing.publicKey,
      privateKey: signing.privateKey,
    },
    exchange: {
      publicKey: exchange.publicKey,
      privateKey: exchange.privateKey,
    },
  };
}

export async function generateSignedPreKey(
  identityKeyPair: IdentityKeyPair,
  keyId: number
): Promise<SignedKeyPair> {
  await initCrypto();

  const keyPair = sodium.crypto_box_keypair();

  const signature = sodium.crypto_sign_detached(
    keyPair.publicKey,
    identityKeyPair.signing.privateKey
  );

  return {
    publicKey: keyPair.publicKey,
    privateKey: keyPair.privateKey,
    keyId,
    signature,
  };
}

export async function generateOneTimePreKeys(
  startKeyId: number,
  count: number
): Promise<Array<{ keyId: number; keyPair: KeyPair }>> {
  await initCrypto();

  const keys: Array<{ keyId: number; keyPair: KeyPair }> = [];

  for (let i = 0; i < count; i++) {
    const keyPair = sodium.crypto_box_keypair();
    keys.push({
      keyId: startKeyId + i,
      keyPair: {
        publicKey: keyPair.publicKey,
        privateKey: keyPair.privateKey,
      },
    });
  }

  return keys;
}

export async function verifySignedPreKey(
  publicKey: Uint8Array,
  signature: Uint8Array,
  identityPublicKey: Uint8Array
): Promise<boolean> {
  await initCrypto();

  try {
    return sodium.crypto_sign_verify_detached(
      signature,
      publicKey,
      identityPublicKey
    );
  } catch {
    return false;
  }
}

export async function x3dhInitiator(
  ourIdentity: IdentityKeyPair,
  ourEphemeral: KeyPair,
  theirBundle: PreKeyBundle
): Promise<{ sharedSecret: Uint8Array; associatedData: Uint8Array }> {
  await initCrypto();

  const isValid = await verifySignedPreKey(
    theirBundle.signedPreKey,
    theirBundle.signedPreKeySignature,
    theirBundle.identityKey
  );

  if (!isValid) {
    throw new Error('Invalid signed pre-key signature');
  }

  const theirIdentityX25519 = sodium.crypto_sign_ed25519_pk_to_curve25519(
    theirBundle.identityKey
  );

  const dh1 = sodium.crypto_scalarmult(
    ourIdentity.exchange.privateKey,
    theirBundle.signedPreKey
  );

  const dh2 = sodium.crypto_scalarmult(
    ourEphemeral.privateKey,
    theirIdentityX25519
  );

  const dh3 = sodium.crypto_scalarmult(
    ourEphemeral.privateKey,
    theirBundle.signedPreKey
  );

  let dh4: Uint8Array | null = null;
  if (theirBundle.oneTimePreKey) {
    dh4 = sodium.crypto_scalarmult(
      ourEphemeral.privateKey,
      theirBundle.oneTimePreKey
    );
  }

  const dhConcat = dh4
    ? new Uint8Array([...dh1, ...dh2, ...dh3, ...dh4])
    : new Uint8Array([...dh1, ...dh2, ...dh3]);

  const sharedSecret = hkdfDerive(dhConcat, 32, 'X3DH');

  const associatedData = new Uint8Array([
    ...ourIdentity.signing.publicKey,
    ...theirBundle.identityKey,
  ]);

  return { sharedSecret, associatedData };
}

export async function x3dhResponder(
  ourIdentity: IdentityKeyPair,
  ourSignedPreKey: KeyPair,
  ourOneTimePreKey: KeyPair | null,
  theirIdentityKey: Uint8Array,
  theirEphemeralKey: Uint8Array
): Promise<{ sharedSecret: Uint8Array; associatedData: Uint8Array }> {
  await initCrypto();

  const theirIdentityX25519 = sodium.crypto_sign_ed25519_pk_to_curve25519(
    theirIdentityKey
  );

  const dh1 = sodium.crypto_scalarmult(
    ourSignedPreKey.privateKey,
    theirIdentityX25519
  );

  const dh2 = sodium.crypto_scalarmult(
    ourIdentity.exchange.privateKey,
    theirEphemeralKey
  );

  const dh3 = sodium.crypto_scalarmult(
    ourSignedPreKey.privateKey,
    theirEphemeralKey
  );

  let dh4: Uint8Array | null = null;
  if (ourOneTimePreKey) {
    dh4 = sodium.crypto_scalarmult(
      ourOneTimePreKey.privateKey,
      theirEphemeralKey
    );
  }

  const dhConcat = dh4
    ? new Uint8Array([...dh1, ...dh2, ...dh3, ...dh4])
    : new Uint8Array([...dh1, ...dh2, ...dh3]);

  const sharedSecret = hkdfDerive(dhConcat, 32, 'X3DH');

  const associatedData = new Uint8Array([
    ...theirIdentityKey,
    ...ourIdentity.signing.publicKey,
  ]);

  return { sharedSecret, associatedData };
}

export async function initializeSessionAsInitiator(
  sharedSecret: Uint8Array,
  associatedData: Uint8Array,
  theirRatchetKey: Uint8Array
): Promise<SessionState> {
  await initCrypto();

  const ourRatchetKey = sodium.crypto_box_keypair();

  const dhOutput = sodium.crypto_scalarmult(
    ourRatchetKey.privateKey,
    theirRatchetKey
  );

  const { rootKey, chainKey } = kdfRatchet(sharedSecret, dhOutput);

  return {
    rootKey,
    sendingChainKey: chainKey,
    receivingChainKey: null,
    ourRatchetKey: {
      publicKey: ourRatchetKey.publicKey,
      privateKey: ourRatchetKey.privateKey,
    },
    theirRatchetKey,
    sendingChainLength: 0,
    receivingChainLength: 0,
    previousChains: new Map(),
    skippedMessageKeys: new Map(),
    associatedData,
  };
}

export async function initializeSessionAsResponder(
  sharedSecret: Uint8Array,
  associatedData: Uint8Array,
  ourRatchetKeyPair: KeyPair
): Promise<SessionState> {
  await initCrypto();

  return {
    rootKey: sharedSecret,
    sendingChainKey: new Uint8Array(32),
    receivingChainKey: null,
    ourRatchetKey: ourRatchetKeyPair,
    theirRatchetKey: null,
    sendingChainLength: 0,
    receivingChainLength: 0,
    previousChains: new Map(),
    skippedMessageKeys: new Map(),
    associatedData,
  };
}

export async function encryptMessage(
  session: SessionState,
  plaintext: string
): Promise<{ encrypted: EncryptedMessage; updatedSession: SessionState }> {
  await initCrypto();

  const { messageKey, nextChainKey } = kdfChain(session.sendingChainKey);

  const nonce = sodium.randombytes_buf(sodium.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES);

  const plaintextBytes = sodium.from_string(plaintext);
  const ciphertext = sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(
    plaintextBytes,
    session.associatedData,
    null,
    nonce,
    messageKey
  );

  const encrypted: EncryptedMessage = {
    ciphertext,
    ratchetKey: session.ourRatchetKey.publicKey,
    messageNumber: session.sendingChainLength,
    previousChainLength: session.receivingChainLength,
    nonce,
  };

  const updatedSession: SessionState = {
    ...session,
    sendingChainKey: nextChainKey,
    sendingChainLength: session.sendingChainLength + 1,
  };

  return { encrypted, updatedSession };
}

export async function decryptMessage(
  session: SessionState,
  encrypted: EncryptedMessage
): Promise<{ plaintext: string; updatedSession: SessionState }> {
  await initCrypto();

  const skippedKeyId = buildSkippedKeyId(encrypted.ratchetKey, encrypted.messageNumber);
  const skippedKey = session.skippedMessageKeys.get(skippedKeyId);

  if (skippedKey) {
    const plaintextBytes = sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(
      null,
      encrypted.ciphertext,
      session.associatedData,
      encrypted.nonce,
      skippedKey
    );

    const plaintext = sodium.to_string(plaintextBytes);
    const updatedSession: SessionState = {
      ...session,
      skippedMessageKeys: new Map(session.skippedMessageKeys),
    };

    updatedSession.skippedMessageKeys.delete(skippedKeyId);
    return { plaintext, updatedSession };
  }

  let currentSession = session;

  const theirKeyChanged = !session.theirRatchetKey ||
    !sodium.memcmp(encrypted.ratchetKey, session.theirRatchetKey);

  if (theirKeyChanged) {
    currentSession = skipMessageKeys(currentSession, encrypted.previousChainLength);
    currentSession = ratchetStep(currentSession, encrypted.ratchetKey);
  }

  currentSession = skipMessageKeys(currentSession, encrypted.messageNumber);

  if (!currentSession.receivingChainKey) {
    throw new Error('Missing receiving chain key');
  }

  const { messageKey, nextChainKey } = kdfChain(currentSession.receivingChainKey);

  const plaintextBytes = sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(
    null,
    encrypted.ciphertext,
    currentSession.associatedData,
    encrypted.nonce,
    messageKey
  );

  const plaintext = sodium.to_string(plaintextBytes);

  const updatedSession: SessionState = {
    ...currentSession,
    receivingChainKey: nextChainKey,
    receivingChainLength: currentSession.receivingChainLength + 1,
  };

  return { plaintext, updatedSession };
}

function hkdfDerive(
  inputKeyMaterial: Uint8Array,
  length: number,
  info: string
): Uint8Array {
  const salt = new Uint8Array(32);
  const prk = sodium.crypto_generichash(32, inputKeyMaterial, salt);

  const infoBytes = sodium.from_string(info);
  const okm = sodium.crypto_generichash(length, new Uint8Array([...prk, ...infoBytes, 1]), null);

  return okm;
}

function kdfRatchet(
  rootKey: Uint8Array,
  dhOutput: Uint8Array
): { rootKey: Uint8Array; chainKey: Uint8Array } {
  const input = new Uint8Array([...rootKey, ...dhOutput]);
  const output = sodium.crypto_generichash(64, input, null);

  return {
    rootKey: output.slice(0, 32),
    chainKey: output.slice(32, 64),
  };
}

function kdfChain(
  chainKey: Uint8Array
): { messageKey: Uint8Array; nextChainKey: Uint8Array } {
  const messageKey = sodium.crypto_generichash(32, chainKey, sodium.from_string('message'));
  const nextChainKey = sodium.crypto_generichash(32, chainKey, sodium.from_string('chain'));

  return { messageKey, nextChainKey };
}

export function serializeSession(session: SessionState): string {
  const B64 = sodium.base64_variants.ORIGINAL;
  const serialized = {
    rootKey: sodium.to_base64(session.rootKey, B64),
    sendingChainKey: sodium.to_base64(session.sendingChainKey, B64),
    receivingChainKey: session.receivingChainKey
      ? sodium.to_base64(session.receivingChainKey, B64)
      : null,
    ourRatchetKey: {
      publicKey: sodium.to_base64(session.ourRatchetKey.publicKey, B64),
      privateKey: sodium.to_base64(session.ourRatchetKey.privateKey, B64),
    },
    theirRatchetKey: session.theirRatchetKey
      ? sodium.to_base64(session.theirRatchetKey, B64)
      : null,
    sendingChainLength: session.sendingChainLength,
    receivingChainLength: session.receivingChainLength,
    previousChains: Array.from(session.previousChains.entries()).map(([key, value]) => ({
      key,
      chainKey: sodium.to_base64(value.chainKey, B64),
      length: value.length,
    })),
    skippedMessageKeys: Array.from(session.skippedMessageKeys.entries()).map(([key, value]) => ({
      key,
      messageKey: sodium.to_base64(value, B64),
    })),
    associatedData: sodium.to_base64(session.associatedData, B64),
  };

  return JSON.stringify(serialized);
}

export function deserializeSession(json: string): SessionState {
  const data = JSON.parse(json);
  const B64 = sodium.base64_variants.ORIGINAL;

  const previousChains = new Map<string, { chainKey: Uint8Array; length: number }>();
  for (const { key, chainKey, length } of data.previousChains ?? []) {
    previousChains.set(key, {
      chainKey: sodium.from_base64(chainKey, B64),
      length,
    });
  }

  const skippedMessageKeys = new Map<string, Uint8Array>();
  for (const { key, messageKey } of data.skippedMessageKeys ?? []) {
    skippedMessageKeys.set(key, sodium.from_base64(messageKey, B64));
  }

  return {
    rootKey: sodium.from_base64(data.rootKey, B64),
    sendingChainKey: sodium.from_base64(data.sendingChainKey, B64),
    receivingChainKey: data.receivingChainKey
      ? sodium.from_base64(data.receivingChainKey, B64)
      : null,
    ourRatchetKey: {
      publicKey: sodium.from_base64(data.ourRatchetKey.publicKey, B64),
      privateKey: sodium.from_base64(data.ourRatchetKey.privateKey, B64),
    },
    theirRatchetKey: data.theirRatchetKey
      ? sodium.from_base64(data.theirRatchetKey, B64)
      : null,
    sendingChainLength: data.sendingChainLength,
    receivingChainLength: data.receivingChainLength,
    previousChains,
    skippedMessageKeys,
    associatedData: sodium.from_base64(data.associatedData, B64),
  };
}

export function serializeEncryptedMessage(message: EncryptedMessage): string {
  const B64 = sodium.base64_variants.ORIGINAL;
  return JSON.stringify({
    ciphertext: sodium.to_base64(message.ciphertext, B64),
    ratchetKey: sodium.to_base64(message.ratchetKey, B64),
    messageNumber: message.messageNumber,
    previousChainLength: message.previousChainLength,
    nonce: sodium.to_base64(message.nonce, B64),
  });
}

export function deserializeEncryptedMessage(json: string): EncryptedMessage {
  const data = JSON.parse(json);
  const B64 = sodium.base64_variants.ORIGINAL;
  return {
    ciphertext: sodium.from_base64(data.ciphertext, B64),
    ratchetKey: sodium.from_base64(data.ratchetKey, B64),
    messageNumber: data.messageNumber,
    previousChainLength: data.previousChainLength,
    nonce: sodium.from_base64(data.nonce, B64),
  };
}

export function keyToBase64(key: Uint8Array): string {
  return sodium.to_base64(key, sodium.base64_variants.ORIGINAL);
}

export function base64ToKey(base64: string): Uint8Array {
  return sodium.from_base64(base64, sodium.base64_variants.ORIGINAL);
}

export async function generateEphemeralKeyPair(): Promise<KeyPair> {
  await initCrypto();
  const keyPair = sodium.crypto_box_keypair();
  return {
    publicKey: keyPair.publicKey,
    privateKey: keyPair.privateKey,
  };
}

// --- Key Escrow (Encrypted Backup) Cryptography ---

/**
 * Derives a strong symmetric key from a user password using PBKDF2
 */
export async function deriveKeyFromPassword(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: new Uint8Array(salt),
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  ) as Promise<CryptoKey>;
}

export interface EncryptedBackupData {
  ciphertextBase64: string;
  nonceBase64: string;
  saltBase64: string;
}

/**
 * Encrypts the raw stringified Signal identity and device ID using the derived password key.
 */
export async function encryptKeyBackup(
  plaintext: string,
  password: string
): Promise<EncryptedBackupData> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const nonce = crypto.getRandomValues(new Uint8Array(12)); // 96-bit nonce for AES-GCM

  const key = await deriveKeyFromPassword(password, salt);
  const enc = new TextEncoder();

  const ciphertextBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce },
    key,
    enc.encode(plaintext)
  );

  return {
    ciphertextBase64: sodium.to_base64(new Uint8Array(ciphertextBuffer), sodium.base64_variants.ORIGINAL),
    nonceBase64: sodium.to_base64(nonce, sodium.base64_variants.ORIGINAL),
    saltBase64: sodium.to_base64(salt, sodium.base64_variants.ORIGINAL),
  };
}

/**
 * Decrypts the raw KeyBackup bundle from the server using the user's password.
 */
export async function decryptKeyBackup(
  backup: EncryptedBackupData,
  password: string
): Promise<string> {
  const salt = sodium.from_base64(backup.saltBase64, sodium.base64_variants.ORIGINAL);
  const nonce = sodium.from_base64(backup.nonceBase64, sodium.base64_variants.ORIGINAL);
  const ciphertext = sodium.from_base64(backup.ciphertextBase64, sodium.base64_variants.ORIGINAL);

  const key = await deriveKeyFromPassword(password, salt);

  const plaintextBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: new Uint8Array(nonce) },
    key,
    new Uint8Array(ciphertext)
  );

  const dec = new TextDecoder();
  return dec.decode(plaintextBuffer);
}
