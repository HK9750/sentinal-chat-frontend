'use client';

import { useCallback, useMemo } from 'react';
import { ensureConversationKey, getConversationKey } from '@/lib/crypto-storage';
import { createConversationAccessCode } from '@/lib/crypto';

export function useConversationKey(conversationId?: string | null) {
  const record = useMemo(() => (conversationId ? getConversationKey(conversationId) : null), [conversationId]);

  const ensureKey = useCallback(async () => {
    if (!conversationId) {
      throw new Error('A conversation must be selected first.');
    }

    return ensureConversationKey(conversationId);
  }, [conversationId]);

  const exportAccessCode = useCallback(async () => {
    const keyRecord = await ensureKey();
    return createConversationAccessCode(keyRecord);
  }, [ensureKey]);

  return {
    record,
    hasKey: Boolean(record),
    ensureKey,
    exportAccessCode,
  };
}
