import type { AxiosProgressEvent } from 'axios';
import { apiClient, getUploadProgress, unwrapData } from '@/services/api-client';
import { API_ROUTES } from '@/lib/constants';
import type {
  Attachment,
  AttachmentViewedPayload,
  CreateAttachmentRequest,
  UploadedFile,
  UploadedFilesPayload,
} from '@/types';

function normalizeAttachment(attachment: Attachment): Attachment {
  return {
    ...attachment,
    filename: attachment.filename ?? null,
    viewed_at: attachment.viewed_at ?? null,
    thumbnail_url: attachment.thumbnail_url ?? null,
    width: attachment.width ?? null,
    height: attachment.height ?? null,
    duration_seconds: attachment.duration_seconds ?? null,
  };
}

export async function uploadFileBlob(
  blob: Blob,
  filename: string,
  onProgress?: (progress: number) => void
): Promise<UploadedFile> {
  const formData = new FormData();
  formData.append('file', blob, filename);

  return unwrapData<UploadedFile>(
    apiClient.post(API_ROUTES.uploads.single, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (event: AxiosProgressEvent) => {
        onProgress?.(getUploadProgress(event));
      },
    })
  );
}

export async function uploadFileBlobs(
  files: Array<{ blob: Blob; filename: string }>,
  onProgress?: (progress: number) => void
): Promise<UploadedFilesPayload> {
  const formData = new FormData();

  for (const file of files) {
    formData.append('files', file.blob, file.filename);
  }

  return unwrapData<UploadedFilesPayload>(
    apiClient.post(API_ROUTES.uploads.bulk, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (event: AxiosProgressEvent) => {
        onProgress?.(getUploadProgress(event));
      },
    })
  );
}

export async function createAttachment(input: CreateAttachmentRequest): Promise<Attachment> {
  const attachment = await unwrapData<Attachment>(apiClient.post(API_ROUTES.uploads.attachments, input));
  return normalizeAttachment(attachment);
}

export async function markAttachmentViewed(attachmentId: string): Promise<AttachmentViewedPayload> {
  return unwrapData<AttachmentViewedPayload>(apiClient.post(API_ROUTES.uploads.viewed(attachmentId)));
}
