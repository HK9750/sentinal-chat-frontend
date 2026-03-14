import type { DecryptedMessageState } from '@/types';

const decryptedMessageCache = new Map<string, DecryptedMessageState>();

function createCacheKey(messageId: string, encryptedContent?: string | null): string {
  return `${messageId}:${encryptedContent ?? 'empty'}`;
}

export function readDecryptedMessage(messageId: string, encryptedContent?: string | null): DecryptedMessageState | null {
  return decryptedMessageCache.get(createCacheKey(messageId, encryptedContent)) ?? null;
}

export function writeDecryptedMessage(
  messageId: string,
  encryptedContent: string | null | undefined,
  value: DecryptedMessageState
): void {
  decryptedMessageCache.set(createCacheKey(messageId, encryptedContent), value);
}

export function clearConversationDecryptedCache(messageIds: string[]): void {
  for (const key of Array.from(decryptedMessageCache.keys())) {
    if (messageIds.some((messageId) => key.startsWith(`${messageId}:`))) {
      decryptedMessageCache.delete(key);
    }
  }
}

export function clearDecryptedMessageCache(): void {
  decryptedMessageCache.clear();
}
