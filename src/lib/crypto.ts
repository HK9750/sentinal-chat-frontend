/**
 * Signal Protocol Cryptography Library
 * 
 * Implements X3DH (Extended Triple Diffie-Hellman) key agreement and
 * Double Ratchet algorithm for end-to-end encrypted messaging.
 * 
 * Uses libsodium for:
 * - X25519 for key exchange (Curve25519)
 * - Ed25519 for signatures
 * - XChaCha20-Poly1305 for authenticated encryption
 * - HKDF for key derivation
 */

import sodium from 'libsodium-wrappers-sumo';

// Ensure sodium is ready before use
let sodiumReady = false;
export async function initCrypto(): Promise<void> {
  if (!sodiumReady) {
    await sodium.ready;
    sodiumReady = true;
  }
}

// ============================================================================
// Key Types
// ============================================================================

export interface KeyPair {
  publicKey: Uint8Array;
  privateKey: Uint8Array;
}

export interface SignedKeyPair extends KeyPair {
  keyId: number;
  signature: Uint8Array;
}

export interface IdentityKeyPair {
  /** Ed25519 signing key pair */
  signing: KeyPair;
  /** X25519 key exchange key pair (derived from signing key) */
  exchange: KeyPair;
}

export interface PreKeyBundle {
  identityKey: Uint8Array;      // Ed25519 public key
  signedPreKey: Uint8Array;     // X25519 public key
  signedPreKeyId: number;
  signedPreKeySignature: Uint8Array;
  oneTimePreKey?: Uint8Array;   // X25519 public key (optional)
  oneTimePreKeyId?: number;
}

export interface SessionState {
  /** Root key for deriving chain keys */
  rootKey: Uint8Array;
  /** Sending chain key */
  sendingChainKey: Uint8Array;
  /** Receiving chain key */
  receivingChainKey: Uint8Array | null;
  /** Our current ratchet key pair */
  ourRatchetKey: KeyPair;
  /** Their current ratchet public key */
  theirRatchetKey: Uint8Array | null;
  /** Number of messages sent in current sending chain */
  sendingChainLength: number;
  /** Number of messages received in current receiving chain */
  receivingChainLength: number;
  /** Previous sending chains for out-of-order messages */
  previousChains: Map<string, { chainKey: Uint8Array; length: number }>;
  /** Associated data for AEAD */
  associatedData: Uint8Array;
}

export interface EncryptedMessage {
  /** Ciphertext */
  ciphertext: Uint8Array;
  /** Current ratchet public key */
  ratchetKey: Uint8Array;
  /** Message number in chain */
  messageNumber: number;
  /** Previous chain length (for key derivation) */
  previousChainLength: number;
  /** Nonce used for encryption */
  nonce: Uint8Array;
}

// ============================================================================
// Key Generation
// ============================================================================

/**
 * Generate an identity key pair (Ed25519 for signing, X25519 for exchange)
 */
export async function generateIdentityKeyPair(): Promise<IdentityKeyPair> {
  await initCrypto();

  console.log('[Crypto] generateIdentityKeyPair: sodium ready, starting key generation');
  console.log('[Crypto] sodium available functions check:', {
    hasCryptoSignKeypair: typeof sodium.crypto_sign_keypair === 'function',
    hasCryptoSignEd25519SkToSeed: typeof sodium.crypto_sign_ed25519_sk_to_seed === 'function',
    hasCryptoBoxSeedKeypair: typeof sodium.crypto_box_seed_keypair === 'function',
  });

  // Generate Ed25519 signing key pair
  let signing: { publicKey: Uint8Array; privateKey: Uint8Array; keyType: string };
  try {
    signing = sodium.crypto_sign_keypair();
    console.log('[Crypto] Ed25519 signing keypair generated', {
      publicKeyLength: signing.publicKey.length,
      privateKeyLength: signing.privateKey.length,
    });
  } catch (err) {
    console.error('[Crypto] FAILED at crypto_sign_keypair():', err);
    throw err;
  }

  // Derive X25519 key pair from Ed25519 seed
  let seed: Uint8Array;
  try {
    seed = sodium.crypto_sign_ed25519_sk_to_seed(signing.privateKey);
    console.log('[Crypto] Seed extracted from Ed25519 SK, length:', seed.length);
  } catch (err) {
    console.error('[Crypto] FAILED at crypto_sign_ed25519_sk_to_seed():', err);
    throw err;
  }

  let exchange: { publicKey: Uint8Array; privateKey: Uint8Array; keyType: string };
  try {
    exchange = sodium.crypto_box_seed_keypair(seed);
    console.log('[Crypto] X25519 exchange keypair derived', {
      publicKeyLength: exchange.publicKey.length,
      privateKeyLength: exchange.privateKey.length,
    });
  } catch (err) {
    console.error('[Crypto] FAILED at crypto_box_seed_keypair():', err);
    throw err;
  }

  console.log('[Crypto] generateIdentityKeyPair: SUCCESS');
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

/**
 * Generate a signed pre-key (X25519 key pair signed by identity key)
 */
export async function generateSignedPreKey(
  identityKeyPair: IdentityKeyPair,
  keyId: number
): Promise<SignedKeyPair> {
  await initCrypto();

  // Generate X25519 key pair
  const keyPair = sodium.crypto_box_keypair();

  // Sign the public key with identity signing key
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

/**
 * Generate a batch of one-time pre-keys (X25519 key pairs)
 */
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

/**
 * Verify a signed pre-key signature
 */
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

// ============================================================================
// X3DH Key Agreement
// ============================================================================

/**
 * Perform X3DH key agreement as the initiator (Alice)
 * 
 * @param ourIdentity Our identity key pair
 * @param ourEphemeral Our ephemeral key pair (generated for this session)
 * @param theirBundle Their pre-key bundle
 * @returns Shared secret and associated data
 */
export async function x3dhInitiator(
  ourIdentity: IdentityKeyPair,
  ourEphemeral: KeyPair,
  theirBundle: PreKeyBundle
): Promise<{ sharedSecret: Uint8Array; associatedData: Uint8Array }> {
  await initCrypto();

  // Verify signed pre-key
  const isValid = await verifySignedPreKey(
    theirBundle.signedPreKey,
    theirBundle.signedPreKeySignature,
    theirBundle.identityKey
  );

  if (!isValid) {
    throw new Error('Invalid signed pre-key signature');
  }

  // Convert their Ed25519 identity key to X25519 for DH
  const theirIdentityX25519 = sodium.crypto_sign_ed25519_pk_to_curve25519(
    theirBundle.identityKey
  );

  // DH1: Our identity key with their signed pre-key
  const dh1 = sodium.crypto_scalarmult(
    ourIdentity.exchange.privateKey,
    theirBundle.signedPreKey
  );

  // DH2: Our ephemeral key with their identity key
  const dh2 = sodium.crypto_scalarmult(
    ourEphemeral.privateKey,
    theirIdentityX25519
  );

  // DH3: Our ephemeral key with their signed pre-key
  const dh3 = sodium.crypto_scalarmult(
    ourEphemeral.privateKey,
    theirBundle.signedPreKey
  );

  // DH4: Our ephemeral key with their one-time pre-key (if available)
  let dh4: Uint8Array | null = null;
  if (theirBundle.oneTimePreKey) {
    dh4 = sodium.crypto_scalarmult(
      ourEphemeral.privateKey,
      theirBundle.oneTimePreKey
    );
  }

  // Concatenate all DH outputs
  const dhConcat = dh4
    ? new Uint8Array([...dh1, ...dh2, ...dh3, ...dh4])
    : new Uint8Array([...dh1, ...dh2, ...dh3]);

  // Derive shared secret using HKDF
  const sharedSecret = hkdfDerive(dhConcat, 32, 'X3DH');

  // Associated data: our identity key || their identity key
  const associatedData = new Uint8Array([
    ...ourIdentity.signing.publicKey,
    ...theirBundle.identityKey,
  ]);

  return { sharedSecret, associatedData };
}

/**
 * Perform X3DH key agreement as the responder (Bob)
 * 
 * @param ourIdentity Our identity key pair
 * @param ourSignedPreKey Our signed pre-key
 * @param ourOneTimePreKey Our one-time pre-key (if used)
 * @param theirIdentityKey Their identity public key (Ed25519)
 * @param theirEphemeralKey Their ephemeral public key (X25519)
 * @returns Shared secret and associated data
 */
export async function x3dhResponder(
  ourIdentity: IdentityKeyPair,
  ourSignedPreKey: KeyPair,
  ourOneTimePreKey: KeyPair | null,
  theirIdentityKey: Uint8Array,
  theirEphemeralKey: Uint8Array
): Promise<{ sharedSecret: Uint8Array; associatedData: Uint8Array }> {
  await initCrypto();

  // Convert their Ed25519 identity key to X25519 for DH
  const theirIdentityX25519 = sodium.crypto_sign_ed25519_pk_to_curve25519(
    theirIdentityKey
  );

  // DH1: Our signed pre-key with their identity key
  const dh1 = sodium.crypto_scalarmult(
    ourSignedPreKey.privateKey,
    theirIdentityX25519
  );

  // DH2: Our identity key with their ephemeral key
  const dh2 = sodium.crypto_scalarmult(
    ourIdentity.exchange.privateKey,
    theirEphemeralKey
  );

  // DH3: Our signed pre-key with their ephemeral key
  const dh3 = sodium.crypto_scalarmult(
    ourSignedPreKey.privateKey,
    theirEphemeralKey
  );

  // DH4: Our one-time pre-key with their ephemeral key (if used)
  let dh4: Uint8Array | null = null;
  if (ourOneTimePreKey) {
    dh4 = sodium.crypto_scalarmult(
      ourOneTimePreKey.privateKey,
      theirEphemeralKey
    );
  }

  // Concatenate all DH outputs (same order as initiator)
  const dhConcat = dh4
    ? new Uint8Array([...dh1, ...dh2, ...dh3, ...dh4])
    : new Uint8Array([...dh1, ...dh2, ...dh3]);

  // Derive shared secret using HKDF
  const sharedSecret = hkdfDerive(dhConcat, 32, 'X3DH');

  // Associated data: their identity key || our identity key
  const associatedData = new Uint8Array([
    ...theirIdentityKey,
    ...ourIdentity.signing.publicKey,
  ]);

  return { sharedSecret, associatedData };
}

// ============================================================================
// Double Ratchet
// ============================================================================

/**
 * Initialize a Double Ratchet session as the initiator
 */
export async function initializeSessionAsInitiator(
  sharedSecret: Uint8Array,
  associatedData: Uint8Array,
  theirRatchetKey: Uint8Array
): Promise<SessionState> {
  await initCrypto();

  // Generate our first ratchet key pair
  const ourRatchetKey = sodium.crypto_box_keypair();

  // Perform DH ratchet step
  const dhOutput = sodium.crypto_scalarmult(
    ourRatchetKey.privateKey,
    theirRatchetKey
  );

  // Derive root key and sending chain key
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
    associatedData,
  };
}

/**
 * Initialize a Double Ratchet session as the responder
 */
export async function initializeSessionAsResponder(
  sharedSecret: Uint8Array,
  associatedData: Uint8Array,
  ourRatchetKeyPair: KeyPair
): Promise<SessionState> {
  await initCrypto();

  return {
    rootKey: sharedSecret,
    sendingChainKey: new Uint8Array(32), // Will be set on first ratchet
    receivingChainKey: null,
    ourRatchetKey: ourRatchetKeyPair,
    theirRatchetKey: null,
    sendingChainLength: 0,
    receivingChainLength: 0,
    previousChains: new Map(),
    associatedData,
  };
}

/**
 * Encrypt a message using Double Ratchet
 */
export async function encryptMessage(
  session: SessionState,
  plaintext: string
): Promise<{ encrypted: EncryptedMessage; updatedSession: SessionState }> {
  await initCrypto();

  // Derive message key from sending chain
  const { messageKey, nextChainKey } = kdfChain(session.sendingChainKey);

  // Generate nonce
  const nonce = sodium.randombytes_buf(sodium.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES);

  // Encrypt using XChaCha20-Poly1305
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

/**
 * Decrypt a message using Double Ratchet
 */
export async function decryptMessage(
  session: SessionState,
  encrypted: EncryptedMessage
): Promise<{ plaintext: string; updatedSession: SessionState }> {
  await initCrypto();

  let currentSession = session;

  // Check if we need to perform a DH ratchet step
  const theirKeyChanged = !session.theirRatchetKey ||
    !sodium.memcmp(encrypted.ratchetKey, session.theirRatchetKey);

  if (theirKeyChanged) {
    // Store previous receiving chain
    if (session.receivingChainKey && session.theirRatchetKey) {
      const keyStr = sodium.to_base64(session.theirRatchetKey);
      session.previousChains.set(keyStr, {
        chainKey: session.receivingChainKey,
        length: session.receivingChainLength,
      });
    }

    // DH ratchet step
    const dhOutput = sodium.crypto_scalarmult(
      session.ourRatchetKey.privateKey,
      encrypted.ratchetKey
    );

    // Derive new receiving chain key
    const { rootKey: newRootKey, chainKey: receivingChainKey } = kdfRatchet(
      session.rootKey,
      dhOutput
    );

    // Generate new ratchet key pair
    const newRatchetKey = sodium.crypto_box_keypair();

    // DH for new sending chain
    const dhOutput2 = sodium.crypto_scalarmult(
      newRatchetKey.privateKey,
      encrypted.ratchetKey
    );

    const { rootKey: finalRootKey, chainKey: sendingChainKey } = kdfRatchet(
      newRootKey,
      dhOutput2
    );

    currentSession = {
      ...session,
      rootKey: finalRootKey,
      sendingChainKey,
      receivingChainKey,
      ourRatchetKey: {
        publicKey: newRatchetKey.publicKey,
        privateKey: newRatchetKey.privateKey,
      },
      theirRatchetKey: encrypted.ratchetKey,
      sendingChainLength: 0,
      receivingChainLength: 0,
      previousChains: session.previousChains,
    };
  }

  // Skip to the correct message key
  let chainKey = currentSession.receivingChainKey!;
  for (let i = currentSession.receivingChainLength; i < encrypted.messageNumber; i++) {
    const { nextChainKey } = kdfChain(chainKey);
    chainKey = nextChainKey;
  }

  // Derive message key
  const { messageKey, nextChainKey } = kdfChain(chainKey);

  // Decrypt
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
    receivingChainLength: encrypted.messageNumber + 1,
  };

  return { plaintext, updatedSession };
}

// ============================================================================
// Key Derivation Functions
// ============================================================================

/**
 * HKDF-based key derivation
 */
function hkdfDerive(
  inputKeyMaterial: Uint8Array,
  length: number,
  info: string
): Uint8Array {
  // Simple HKDF implementation using sodium
  const salt = new Uint8Array(32); // Zero salt for X3DH
  const prk = sodium.crypto_generichash(32, inputKeyMaterial, salt);

  const infoBytes = sodium.from_string(info);
  const okm = sodium.crypto_generichash(length, new Uint8Array([...prk, ...infoBytes, 1]), null);

  return okm;
}

/**
 * KDF for Double Ratchet root key derivation
 */
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

/**
 * KDF for chain key derivation (symmetric ratchet)
 */
function kdfChain(
  chainKey: Uint8Array
): { messageKey: Uint8Array; nextChainKey: Uint8Array } {
  const messageKey = sodium.crypto_generichash(32, chainKey, sodium.from_string('message'));
  const nextChainKey = sodium.crypto_generichash(32, chainKey, sodium.from_string('chain'));

  return { messageKey, nextChainKey };
}

// ============================================================================
// Serialization
// ============================================================================

/**
 * Serialize a session state to JSON-compatible format for storage
 */
export function serializeSession(session: SessionState): string {
  const serialized = {
    rootKey: sodium.to_base64(session.rootKey),
    sendingChainKey: sodium.to_base64(session.sendingChainKey),
    receivingChainKey: session.receivingChainKey
      ? sodium.to_base64(session.receivingChainKey)
      : null,
    ourRatchetKey: {
      publicKey: sodium.to_base64(session.ourRatchetKey.publicKey),
      privateKey: sodium.to_base64(session.ourRatchetKey.privateKey),
    },
    theirRatchetKey: session.theirRatchetKey
      ? sodium.to_base64(session.theirRatchetKey)
      : null,
    sendingChainLength: session.sendingChainLength,
    receivingChainLength: session.receivingChainLength,
    previousChains: Array.from(session.previousChains.entries()).map(([key, value]) => ({
      key,
      chainKey: sodium.to_base64(value.chainKey),
      length: value.length,
    })),
    associatedData: sodium.to_base64(session.associatedData),
  };

  return JSON.stringify(serialized);
}

/**
 * Deserialize a session state from JSON
 */
export function deserializeSession(json: string): SessionState {
  const data = JSON.parse(json);

  const previousChains = new Map<string, { chainKey: Uint8Array; length: number }>();
  for (const { key, chainKey, length } of data.previousChains) {
    previousChains.set(key, {
      chainKey: sodium.from_base64(chainKey),
      length,
    });
  }

  return {
    rootKey: sodium.from_base64(data.rootKey),
    sendingChainKey: sodium.from_base64(data.sendingChainKey),
    receivingChainKey: data.receivingChainKey
      ? sodium.from_base64(data.receivingChainKey)
      : null,
    ourRatchetKey: {
      publicKey: sodium.from_base64(data.ourRatchetKey.publicKey),
      privateKey: sodium.from_base64(data.ourRatchetKey.privateKey),
    },
    theirRatchetKey: data.theirRatchetKey
      ? sodium.from_base64(data.theirRatchetKey)
      : null,
    sendingChainLength: data.sendingChainLength,
    receivingChainLength: data.receivingChainLength,
    previousChains,
    associatedData: sodium.from_base64(data.associatedData),
  };
}

/**
 * Serialize an encrypted message for transmission
 */
export function serializeEncryptedMessage(message: EncryptedMessage): string {
  return JSON.stringify({
    ciphertext: sodium.to_base64(message.ciphertext),
    ratchetKey: sodium.to_base64(message.ratchetKey),
    messageNumber: message.messageNumber,
    previousChainLength: message.previousChainLength,
    nonce: sodium.to_base64(message.nonce),
  });
}

/**
 * Deserialize an encrypted message
 */
export function deserializeEncryptedMessage(json: string): EncryptedMessage {
  const data = JSON.parse(json);
  return {
    ciphertext: sodium.from_base64(data.ciphertext),
    ratchetKey: sodium.from_base64(data.ratchetKey),
    messageNumber: data.messageNumber,
    previousChainLength: data.previousChainLength,
    nonce: sodium.from_base64(data.nonce),
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Convert a key to base64 string for API transmission
 */
export function keyToBase64(key: Uint8Array): string {
  // Use ORIGINAL variant (standard base64 with +/= padding) to match Go's base64.StdEncoding
  return sodium.to_base64(key, sodium.base64_variants.ORIGINAL);
}

/**
 * Convert a base64 string to key bytes
 */
export function base64ToKey(base64: string): Uint8Array {
  return sodium.from_base64(base64, sodium.base64_variants.ORIGINAL);
}

/**
 * Generate a random ephemeral key pair for X3DH
 */
export async function generateEphemeralKeyPair(): Promise<KeyPair> {
  await initCrypto();
  const keyPair = sodium.crypto_box_keypair();
  return {
    publicKey: keyPair.publicKey,
    privateKey: keyPair.privateKey,
  };
}
