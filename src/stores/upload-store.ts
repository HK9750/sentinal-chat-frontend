'use client';

import { create } from 'zustand';
import type { UploadQueueItem } from '@/types';

interface UploadState {
  items: UploadQueueItem[];
  addUpload: (item: UploadQueueItem) => void;
  updateUpload: (id: string, patch: Partial<UploadQueueItem>) => void;
  removeUpload: (id: string) => void;
  clearUploads: () => void;
}

export const useUploadStore = create<UploadState>((set) => ({
  items: [],
  addUpload: (item) => set((state) => ({ items: [...state.items, item] })),
  updateUpload: (id, patch) =>
    set((state) => ({
      items: state.items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    })),
  removeUpload: (id) => set((state) => ({ items: state.items.filter((item) => item.id !== id) })),
  clearUploads: () => set({ items: [] }),
}));
