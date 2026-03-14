'use client';

import { useMutation } from '@tanstack/react-query';
import { prepareEncryptedFiles, prepareEncryptedVoiceNote } from '@/services/encryption-service';
import type { VoiceRecordingResult } from '@/types';

export function useEncryptedFileUploadMutation(conversationId: string) {
  return useMutation({
    mutationFn: (files: File[]) => prepareEncryptedFiles(conversationId, files),
  });
}

export function useEncryptedVoiceUploadMutation(conversationId: string) {
  return useMutation({
    mutationFn: (recording: VoiceRecordingResult) => prepareEncryptedVoiceNote(conversationId, recording),
  });
}
