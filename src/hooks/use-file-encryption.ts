'use client';

import { useMutation } from '@tanstack/react-query';
import { prepareEncryptedFiles } from '@/services/encryption-service';

export function useFileEncryption(conversationId?: string | null) {
  return useMutation({
    mutationFn: (files: File[]) => {
      if (!conversationId) {
        throw new Error('A conversation must be selected first.');
      }

      return prepareEncryptedFiles(conversationId, files);
    },
  });
}
