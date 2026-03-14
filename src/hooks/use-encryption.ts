'use client';

import { useCallback } from 'react';
import {
  decryptConversationPayload,
  encryptConversationPayload,
  exportConversationAccess,
  exportVaultBackup,
  importConversationAccess,
  importVaultBackup,
} from '@/services/encryption-service';
import type { Message, SecureMessagePayload } from '@/types';

export function useEncryption() {
  const encryptForConversation = useCallback(
    (conversationId: string, payload: SecureMessagePayload) => encryptConversationPayload(conversationId, payload),
    []
  );

  const decryptForConversation = useCallback(
    (conversationId: string, message: Pick<Message, 'conversation_id' | 'encrypted_content' | 'deleted_at'>) =>
      decryptConversationPayload(conversationId, message),
    []
  );

  return {
    encryptForConversation,
    decryptForConversation,
    exportConversationAccess,
    importConversationAccess,
    exportVaultBackup,
    importVaultBackup,
  };
}
