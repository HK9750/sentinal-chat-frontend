'use client';

import { useMutation } from '@tanstack/react-query';
import { createAttachment, uploadFileBlob, uploadFileBlobs } from '@/services/upload-service';
import type { VoiceRecordingResult } from '@/types';

function toAttachmentMetadata(file: File | { name: string; type: string; size: number }, fileUrl: string) {
  return {
    file_url: fileUrl,
    filename: file.name,
    mime_type: file.type || 'application/octet-stream',
    size_bytes: file.size,
  };
}

export function useFileUploadMutation() {
  return useMutation({
    mutationFn: async ({ files, onProgress }: { files: File[]; onProgress?: (progress: number) => void }) => {
      const uploaded = await uploadFileBlobs(
        files.map((file) => ({ blob: file, filename: file.name })),
        onProgress
      );

      const attachments = await Promise.all(
        uploaded.items.map((item, index) => createAttachment(toAttachmentMetadata(files[index], item.file_url ?? '')))
      );

      return { attachments };
    },
  });
}

export function useVoiceUploadMutation() {
  return useMutation({
    mutationFn: async ({ recording, onProgress }: { recording: VoiceRecordingResult; onProgress?: (progress: number) => void }) => {
      const uploaded = await uploadFileBlob(recording.blob, 'voice-note.webm', onProgress);
      const attachment = await createAttachment({
        file_url: uploaded.file_url ?? '',
        filename: uploaded.filename,
        mime_type: recording.mime_type,
        size_bytes: recording.blob.size,
        duration_seconds: Math.max(1, Math.round(recording.duration_ms / 1000)),
      });

      return { attachment };
    },
  });
}
