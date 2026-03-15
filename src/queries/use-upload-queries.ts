'use client';

import { useMutation } from '@tanstack/react-query';
import { prepareEncryptedFiles, prepareEncryptedVoiceNote } from '@/services/encryption-service';
import type { VoiceRecordingResult } from '@/types';

export function useEncryptedFileUploadMutation(conversationId: string) {
  return useMutation({
    mutationFn: ({ files, onProgress }: { files: File[]; onProgress?: (progress: number) => void }) =>
      prepareEncryptedFiles(conversationId, files, onProgress),
  });
}

export function useEncryptedVoiceUploadMutation(conversationId: string) {
  return useMutation({
    mutationFn: ({ recording, onProgress }: { recording: VoiceRecordingResult; onProgress?: (progress: number) => void }) =>
      prepareEncryptedVoiceNote(conversationId, recording, onProgress),
  });
}
