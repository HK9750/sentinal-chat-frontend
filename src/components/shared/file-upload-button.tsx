'use client';

import { useRef, useCallback, useState } from 'react';
import { Paperclip, X, Upload, FileIcon, ImageIcon, FileVideo, FileAudio } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUploadStore } from '@/stores/upload-store';
import { useAuthStore } from '@/stores/auth-store';
import { useCreateUpload, useCompleteUpload } from '@/queries/use-upload-queries';
import { cn } from '@/lib/utils';
import { v4 as uuidv4 } from 'uuid';

interface FileUploadButtonProps {
  conversationId: string;
  onUploadComplete?: (fileUrl: string, fileName: string) => void;
  className?: string;
  disabled?: boolean;
}

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

function getFileIcon(contentType: string) {
  if (contentType.startsWith('image/')) {
    return <ImageIcon className="h-4 w-4" />;
  }
  if (contentType.startsWith('video/')) {
    return <FileVideo className="h-4 w-4" />;
  }
  if (contentType.startsWith('audio/')) {
    return <FileAudio className="h-4 w-4" />;
  }
  return <FileIcon className="h-4 w-4" />;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileUploadButton({
  conversationId,
  onUploadComplete,
  className,
  disabled,
}: FileUploadButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const startUpload = useUploadStore((state) => state.startUpload);
  const updateProgress = useUploadStore((state) => state.updateProgress);
  const setUploadStatus = useUploadStore((state) => state.setUploadStatus);
  const uploads = useUploadStore((state) => state.uploads);

  const user = useAuthStore((state) => state.user);

  const createUpload = useCreateUpload();
  const completeUpload = useCompleteUpload();

  // Get active uploads for this conversation
  const activeUploads = Array.from(uploads.values()).filter(
    (u) => u.conversationId === conversationId &&
      (u.status === 'PENDING' || u.status === 'IN_PROGRESS')
  );

  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploadError(null);

    for (const file of Array.from(files)) {
      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        setUploadError(`File "${file.name}" is too large. Maximum size is 50MB.`);
        continue;
      }

      const uploadId = uuidv4();
      const abortController = new AbortController();

      // Add to upload store
      startUpload({
        id: uploadId,
        fileName: file.name,
        fileSize: file.size,
        contentType: file.type || 'application/octet-stream',
        conversationId,
        abortController,
      });

      try {
        if (!user) {
          throw new Error('User not authenticated');
        }

        // Create upload session
        const session = await createUpload.mutateAsync({
          file_name: file.name,
          file_size: file.size,
          content_type: file.type || 'application/octet-stream',
          uploader_id: user.id,
        });

        if (!session) {
          throw new Error('Failed to create upload session');
        }

        // Upload the file with progress tracking
        const formData = new FormData();
        formData.append('file', file);

        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            updateProgress(uploadId, e.loaded);
          }
        });

        xhr.addEventListener('load', async () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            // Complete the upload
            const result = await completeUpload.mutateAsync(session.id);
            setUploadStatus(uploadId, 'COMPLETED');

            if (result?.file_url && onUploadComplete) {
              onUploadComplete(result.file_url, file.name);
            }
          } else {
            setUploadStatus(uploadId, 'FAILED', `Upload failed: ${xhr.statusText}`);
          }
        });

        xhr.addEventListener('error', () => {
          setUploadStatus(uploadId, 'FAILED', 'Network error during upload');
        });

        xhr.addEventListener('abort', () => {
          setUploadStatus(uploadId, 'CANCELLED');
        });

        // Use the upload URL from the session (assuming it's provided)
        xhr.open('PUT', `/api/uploads/${session.id}/data`);
        xhr.send(formData);

      } catch (error) {
        console.error('Upload error:', error);
        setUploadStatus(
          uploadId,
          'FAILED',
          error instanceof Error ? error.message : 'Upload failed'
        );
      }
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [
    conversationId,
    startUpload,
    updateProgress,
    setUploadStatus,
    createUpload,
    completeUpload,
    onUploadComplete,
  ]);

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return (
    <div className="relative">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileSelect}
        accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt,.zip"
      />

      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={handleClick}
        disabled={disabled || createUpload.isPending}
        className={cn(
          'text-slate-400 hover:text-slate-100 hover:bg-slate-700',
          className
        )}
      >
        <Paperclip className="h-5 w-5" />
      </Button>

      {/* Active uploads indicator */}
      {activeUploads.length > 0 && (
        <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-blue-600 text-[10px] text-white flex items-center justify-center font-medium">
          {activeUploads.length}
        </div>
      )}

      {/* Upload error tooltip */}
      {uploadError && (
        <div className="absolute bottom-full left-0 mb-2 px-3 py-2 bg-red-900/90 text-red-200 text-xs rounded-lg whitespace-nowrap">
          {uploadError}
        </div>
      )}
    </div>
  );
}

// Progress indicator to show in message input area
interface UploadProgressListProps {
  conversationId: string;
}

export function UploadProgressList({ conversationId }: UploadProgressListProps) {
  const uploads = useUploadStore((state) => state.uploads);
  const cancelUpload = useUploadStore((state) => state.cancelUpload);
  const removeUpload = useUploadStore((state) => state.removeUpload);

  const relevantUploads = Array.from(uploads.values()).filter(
    (u) => u.conversationId === conversationId
  );

  if (relevantUploads.length === 0) return null;

  return (
    <div className="px-4 py-2 border-t border-slate-700 bg-slate-800/50">
      <div className="flex flex-wrap gap-2">
        {relevantUploads.map((upload) => {
          const progress = upload.fileSize > 0
            ? Math.round((upload.uploadedBytes / upload.fileSize) * 100)
            : 0;

          return (
            <div
              key={upload.id}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-lg',
                'bg-slate-700/50 border border-slate-600',
                upload.status === 'FAILED' && 'border-red-600/50 bg-red-900/20',
                upload.status === 'COMPLETED' && 'border-emerald-600/50 bg-emerald-900/20'
              )}
            >
              {getFileIcon(upload.contentType)}

              <div className="flex flex-col min-w-0">
                <span className="text-xs text-slate-200 truncate max-w-37.5">
                  {upload.fileName}
                </span>
                <span className="text-[10px] text-slate-400">
                  {upload.status === 'IN_PROGRESS' && `${progress}% - `}
                  {formatFileSize(upload.uploadedBytes)} / {formatFileSize(upload.fileSize)}
                </span>
              </div>

              {/* Progress bar */}
              {upload.status === 'IN_PROGRESS' && (
                <div className="w-16 h-1.5 bg-slate-600 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              )}

              {/* Status indicator */}
              {upload.status === 'COMPLETED' && (
                <span className="text-emerald-400 text-xs">Done</span>
              )}
              {upload.status === 'FAILED' && (
                <span className="text-red-400 text-xs">Failed</span>
              )}

              {/* Cancel/Remove button */}
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => {
                  if (upload.status === 'IN_PROGRESS' || upload.status === 'PENDING') {
                    cancelUpload(upload.id);
                  } else {
                    removeUpload(upload.id);
                  }
                }}
                className="h-5 w-5 text-slate-400 hover:text-slate-100"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
