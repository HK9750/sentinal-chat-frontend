import { STORAGE_KEYS } from '@/lib/constants';
import { createConversationKeyRecord, createConversationKeyRecordFromSecret, parseConversationAccessCode } from '@/lib/crypto';
import type { ConversationAccessCode, ConversationKeyRecord, CryptoVaultState, StoredDeviceKeyPair } from '@/types';

export const CONVERSATION_KEYS_UPDATED_EVENT = 'sentinel:conversation-keys-updated';

interface ConversationKeysUpdatedDetail {
  action: 'saved' | 'removed' | 'cleared';
  conversationId?: string;
}

interface StoredVault {
  version: 1;
  device_fingerprint: string;
  device_keys: StoredDeviceKeyPair | null;
  keys: ConversationKeyRecord[];
}

function createEmptyVault(): StoredVault {
  return {
    version: 1,
    device_fingerprint: crypto.randomUUID().slice(0, 12).toUpperCase(),
    device_keys: null,
    keys: [],
  };
}

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function emitConversationKeysUpdated(detail: ConversationKeysUpdatedDetail): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new CustomEvent(CONVERSATION_KEYS_UPDATED_EVENT, { detail }));
}

function readVault(): StoredVault {
  if (!canUseStorage()) {
    return createEmptyVault();
  }

  const value = window.localStorage.getItem(STORAGE_KEYS.conversationKeys);

  if (!value) {
    const emptyVault = createEmptyVault();
    writeVault(emptyVault);
    return emptyVault;
  }

  try {
    const parsed = JSON.parse(value) as StoredVault;
      return {
        version: 1,
        device_fingerprint: parsed.device_fingerprint || createEmptyVault().device_fingerprint,
        device_keys: parsed.device_keys ?? null,
        keys: parsed.keys ?? [],
      };
  } catch {
    const emptyVault = createEmptyVault();
    writeVault(emptyVault);
    return emptyVault;
  }
}

function writeVault(vault: StoredVault): void {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(STORAGE_KEYS.conversationKeys, JSON.stringify(vault));
}

export function getCryptoVaultState(): CryptoVaultState {
  const vault = readVault();

  return {
    ready: true,
    device_fingerprint: vault.device_fingerprint,
    stored_keys: vault.keys.length,
  };
}

export function getStoredDeviceKeyPair(): StoredDeviceKeyPair | null {
  return readVault().device_keys;
}

export function saveStoredDeviceKeyPair(pair: StoredDeviceKeyPair): StoredDeviceKeyPair {
  const vault = readVault();
  writeVault({
    ...vault,
    device_keys: {
      ...pair,
      updated_at: new Date().toISOString(),
    },
  });
  emitConversationKeysUpdated({ action: 'saved' });
  return pair;
}

export function listConversationKeys(): ConversationKeyRecord[] {
  return readVault().keys;
}

export function getConversationKey(conversationId: string): ConversationKeyRecord | null {
  const vault = readVault();
  return vault.keys.find((entry) => entry.conversation_id === conversationId) ?? null;
}

export function saveConversationKey(record: ConversationKeyRecord): ConversationKeyRecord {
  const vault = readVault();
  const nextKeys = vault.keys.filter((entry) => entry.conversation_id !== record.conversation_id);
  nextKeys.unshift({ ...record, updated_at: new Date().toISOString() });
  writeVault({ ...vault, keys: nextKeys });
  emitConversationKeysUpdated({ action: 'saved', conversationId: record.conversation_id });
  return record;
}

export async function ensureConversationKey(conversationId: string): Promise<ConversationKeyRecord> {
  const existing = getConversationKey(conversationId);

  if (existing) {
    return existing;
  }

  const created = await createConversationKeyRecord(conversationId);
  return saveConversationKey(created);
}

export async function saveConversationSecret(
  conversationId: string,
  secret: string,
  source: ConversationKeyRecord['source'] = 'synced'
): Promise<ConversationKeyRecord> {
  const record = await createConversationKeyRecordFromSecret(conversationId, secret, source);
  return saveConversationKey(record);
}

export function requireConversationKeyRecord(conversationId: string): ConversationKeyRecord {
  const record = getConversationKey(conversationId);

  if (!record) {
    throw new Error('This device does not have the conversation key for this thread yet. Import the access code first.');
  }

  return record;
}

export function removeConversationKey(conversationId: string): void {
  const vault = readVault();
  writeVault({
    ...vault,
    keys: vault.keys.filter((entry) => entry.conversation_id !== conversationId),
  });
  emitConversationKeysUpdated({ action: 'removed', conversationId });
}

export function clearConversationKeys(): void {
  writeVault(createEmptyVault());
  emitConversationKeysUpdated({ action: 'cleared' });
}

export async function importConversationAccessCode(code: string): Promise<ConversationAccessCode> {
  const record = await parseConversationAccessCode(code);
  saveConversationKey(record);

  return {
    code,
    fingerprint: record.fingerprint,
  };
}
