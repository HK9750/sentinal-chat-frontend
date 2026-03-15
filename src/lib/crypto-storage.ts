import { STORAGE_KEYS } from '@/lib/constants';
import { createConversationKeyRecord, parseConversationAccessCode } from '@/lib/crypto';
import type { ConversationAccessCode, ConversationKeyRecord, CryptoVaultState } from '@/types';

interface StoredVault {
  version: 1;
  device_fingerprint: string;
  keys: ConversationKeyRecord[];
}

function createEmptyVault(): StoredVault {
  return {
    version: 1,
    device_fingerprint: crypto.randomUUID().slice(0, 12).toUpperCase(),
    keys: [],
  };
}

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
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
}

export function clearConversationKeys(): void {
  writeVault(createEmptyVault());
}

export async function importConversationAccessCode(code: string): Promise<ConversationAccessCode> {
  const record = await parseConversationAccessCode(code);
  saveConversationKey(record);

  return {
    code,
    fingerprint: record.fingerprint,
  };
}
