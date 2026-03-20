export interface UploadedFile {
  filename: string;
  mime_type: string;
  size_bytes: number;
  object_key: string;
  file_url?: string | null;
}

export interface UploadedFilesPayload {
  items: UploadedFile[];
}

export interface Attachment {
  id: string;
  uploader_id?: string | null;
  file_url: string;
  filename?: string | null;
  mime_type: string;
  size_bytes: number;
  view_once: boolean;
  viewed_at?: string | null;
  thumbnail_url?: string | null;
  width?: number | null;
  height?: number | null;
  duration_seconds?: number | null;
  created_at?: string;
}

export interface BackendMessageAttachment {
  id: string;
  file_url: string;
  filename?: string | null;
  mime_type: string;
  size_bytes: number;
  thumbnail_url?: string | null;
  width?: number | null;
  height?: number | null;
  duration_seconds?: number | null;
  view_once: boolean;
  viewed_at?: string | null;
}

export interface CreateAttachmentRequest {
  message_id?: string;
  file_url: string;
  filename: string;
  mime_type: string;
  size_bytes: number;
  view_once?: boolean;
  thumbnail_url?: string;
  width?: number;
  height?: number;
  duration_seconds?: number;
}

export interface AttachmentViewedPayload {
  attachment_id: string;
  viewed: boolean;
  viewed_at: string;
}

export interface UploadQueueItem {
  id: string;
  conversation_id: string;
  filename: string;
  mime_type: string;
  progress: number;
  status: 'uploading' | 'registering' | 'sending' | 'done' | 'error';
  error?: string;
}

export interface VoiceRecordingResult {
  blob: Blob;
  duration_ms: number;
  mime_type: string;
}
