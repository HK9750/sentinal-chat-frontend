export type UploadStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';

export interface Upload {
  id: string;
  file_name: string;
  file_size: number;
  content_type: string;
  uploader_id: string;
  status: UploadStatus;
  uploaded_bytes: number;
  file_url?: string;
  created_at: string;
  completed_at?: string;
}
