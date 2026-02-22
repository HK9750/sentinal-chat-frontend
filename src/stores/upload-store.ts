import { create } from 'zustand';
import type { UploadStatus } from '@/types/upload';

export interface UploadProgress {
  id: string;
  fileName: string;
  fileSize: number;
  contentType: string;
  uploadedBytes: number;
  status: UploadStatus;
  error?: string;
  abortController?: AbortController;
  conversationId?: string;
}

interface UploadState {
  uploads: Map<string, UploadProgress>;
  
  startUpload: (upload: Omit<UploadProgress, 'status' | 'uploadedBytes'>) => void;
  updateProgress: (id: string, uploadedBytes: number) => void;
  setUploadStatus: (id: string, status: UploadStatus, error?: string) => void;
  cancelUpload: (id: string) => void;
  removeUpload: (id: string) => void;
  clearCompletedUploads: () => void;
  getUploadsByConversation: (conversationId: string) => UploadProgress[];
}

export const useUploadStore = create<UploadState>((set, get) => ({
  uploads: new Map(),

  startUpload: (upload) => {
    set((state) => {
      const newUploads = new Map(state.uploads);
      newUploads.set(upload.id, {
        ...upload,
        status: 'PENDING',
        uploadedBytes: 0,
      });
      return { uploads: newUploads };
    });
  },

  updateProgress: (id, uploadedBytes) => {
    set((state) => {
      const newUploads = new Map(state.uploads);
      const existing = newUploads.get(id);
      if (existing) {
        newUploads.set(id, {
          ...existing,
          uploadedBytes,
          status: 'IN_PROGRESS',
        });
      }
      return { uploads: newUploads };
    });
  },

  setUploadStatus: (id, status, error) => {
    set((state) => {
      const newUploads = new Map(state.uploads);
      const existing = newUploads.get(id);
      if (existing) {
        newUploads.set(id, {
          ...existing,
          status,
          error,
        });
      }
      return { uploads: newUploads };
    });
  },

  cancelUpload: (id) => {
    const { uploads } = get();
    const upload = uploads.get(id);
    
    if (upload?.abortController) {
      upload.abortController.abort();
    }
    
    set((state) => {
      const newUploads = new Map(state.uploads);
      const existing = newUploads.get(id);
      if (existing) {
        newUploads.set(id, {
          ...existing,
          status: 'CANCELLED',
        });
      }
      return { uploads: newUploads };
    });
  },

  removeUpload: (id) => {
    set((state) => {
      const newUploads = new Map(state.uploads);
      newUploads.delete(id);
      return { uploads: newUploads };
    });
  },

  clearCompletedUploads: () => {
    set((state) => {
      const newUploads = new Map(state.uploads);
      for (const [id, upload] of newUploads) {
        if (upload.status === 'COMPLETED' || upload.status === 'CANCELLED') {
          newUploads.delete(id);
        }
      }
      return { uploads: newUploads };
    });
  },

  getUploadsByConversation: (conversationId) => {
    const { uploads } = get();
    return Array.from(uploads.values()).filter(
      (upload) => upload.conversationId === conversationId
    );
  },
}));

export const useActiveUploads = () => {
  const uploads = useUploadStore((state) => state.uploads);
  return Array.from(uploads.values()).filter(
    (upload) => upload.status === 'PENDING' || upload.status === 'IN_PROGRESS'
  );
};

export const useUploadProgress = (id: string) => {
  return useUploadStore((state) => state.uploads.get(id));
};
