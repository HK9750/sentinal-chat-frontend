'use client';

import { useRef, useCallback, useState } from 'react';
import { Paperclip } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUploadStore } from '@/stores/upload-store';
import { useAuthStore } from '@/stores/auth-store';
import { useCreateUpload, useCompleteUpload } from '@/queries/use-upload-queries';
import { cn } from '@/lib/utils';
import { v4 as uuidv4 } from 'uuid';

const MAX_FILE_SIZE = 50 * 1024 * 1024;

interface FileUploadButtonProps {
  conversationId: string;
  onUploadComplete?: (fileUrl: string, fileName: string) => void;
  className?: string;
  disabled?: boolean;
}

export function FileUploadButton({ conversationId, onUploadComplete, className, disabled }: FileUploadButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const startUpload = useUploadStore((state) => state.startUpload);
  const updateProgress = useUploadStore((state) => state.updateProgress);
  const setUploadStatus = useUploadStore((state) => state.setUploadStatus);
  const uploads = useUploadStore((state) => state.uploads);
  const user = useAuthStore((state) => state.user);
  const createUpload = useCreateUpload();
  const completeUpload = useCompleteUpload();

  const activeUploads = Array.from(uploads.values()).filter(
    (u) => u.conversationId === conversationId && (u.status === 'PENDING' || u.status === 'IN_PROGRESS')
  );

  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    setUploadError(null);

    for (const file of Array.from(files)) {
      if (file.size > MAX_FILE_SIZE) {
        setUploadError(`File "${file.name}" is too large. Maximum size is 50MB.`);
        continue;
      }

      const uploadId = uuidv4();
      const abortController = new AbortController();

      startUpload({
        id: uploadId,
        fileName: file.name,
        fileSize: file.size,
        contentType: file.type || 'application/octet-stream',
        conversationId,
        abortController,
      });

      try {
        if (!user) throw new Error('User not authenticated');

        const session = await createUpload.mutateAsync({
          file_name: file.name,
          file_size: file.size,
          content_type: file.type || 'application/octet-stream',
          uploader_id: user.id,
        });

        if (!session) throw new Error('Failed to create upload session');

        const formData = new FormData();
        formData.append('file', file);

        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) updateProgress(uploadId, e.loaded);
        });

        xhr.addEventListener('load', async () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            const result = await completeUpload.mutateAsync(session.id);
            setUploadStatus(uploadId, 'COMPLETED');
            if (result?.file_url && onUploadComplete) onUploadComplete(result.file_url, file.name);
          } else {
            setUploadStatus(uploadId, 'FAILED', `Upload failed: ${xhr.statusText}`);
          }
        });

        xhr.addEventListener('error', () => setUploadStatus(uploadId, 'FAILED', 'Network error during upload'));
        xhr.addEventListener('abort', () => setUploadStatus(uploadId, 'CANCELLED'));

        xhr.open('PUT', `/api/uploads/${session.id}/data`);
        xhr.send(formData);
      } catch (error) {
        setUploadStatus(uploadId, 'FAILED', error instanceof Error ? error.message : 'Upload failed');
      }
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [conversationId, startUpload, updateProgress, setUploadStatus, createUpload, completeUpload, onUploadComplete, user]);

  return (
    <div className="relative">
      <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileSelect} accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt,.zip" />

      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => fileInputRef.current?.click()}
        disabled={disabled || createUpload.isPending}
        className={cn('text-slate-400 hover:text-slate-100 hover:bg-slate-700', className)}
      >
        <Paperclip className="h-5 w-5" />
      </Button>

      {activeUploads.length > 0 && (
        <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-blue-600 text-[10px] text-white flex items-center justify-center font-medium">
          {activeUploads.length}
        </div>
      )}

      {uploadError && (
        <div className="absolute bottom-full left-0 mb-2 px-3 py-2 bg-red-900/90 text-red-200 text-xs rounded-lg whitespace-nowrap">
          {uploadError}
        </div>
      )}
    </div>
  );
}
