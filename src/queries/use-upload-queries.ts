import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  uploadService,
  CreateUploadRequest,
  UpdateUploadProgressRequest,
} from '@/services/upload-service';
import { Upload } from '@/types';

/**
 * Fetch upload status by ID
 */
export function useUpload(uploadId: string) {
  return useQuery({
    queryKey: ['uploads', uploadId],
    queryFn: async () => {
      const response = await uploadService.getById(uploadId);
      if (!response.success) {
        throw new Error(response.error);
      }
      return response.data;
    },
    enabled: !!uploadId,
    staleTime: 5_000, // Uploads status can change frequently
  });
}

/**
 * Fetch user's uploads
 */
export function useUploads(uploaderId?: string) {
  return useQuery({
    queryKey: ['uploads', { uploaderId }],
    queryFn: async () => {
      const response = await uploadService.list(uploaderId);
      if (!response.success) {
        throw new Error(response.error);
      }
      return response.data?.uploads || [];
    },
    staleTime: 30_000,
  });
}

/**
 * Fetch completed uploads
 */
export function useCompletedUploads() {
  return useQuery({
    queryKey: ['uploads', 'completed'],
    queryFn: async () => {
      const response = await uploadService.listCompleted();
      if (!response.success) {
        throw new Error(response.error);
      }
      return response.data?.uploads || [];
    },
    staleTime: 60_000,
  });
}

/**
 * Fetch in-progress uploads
 */
export function useInProgressUploads() {
  return useQuery({
    queryKey: ['uploads', 'in-progress'],
    queryFn: async () => {
      const response = await uploadService.listInProgress();
      if (!response.success) {
        throw new Error(response.error);
      }
      return response.data?.uploads || [];
    },
    staleTime: 10_000,
    refetchInterval: 15_000, // Refetch periodically to track progress
  });
}

/**
 * Create a new upload session
 */
export function useCreateUpload() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateUploadRequest) => {
      const response = await uploadService.create(data);
      if (!response.success) {
        throw new Error(response.error);
      }
      return response.data;
    },
    onSuccess: (newUpload) => {
      if (newUpload) {
        // Add to in-progress uploads cache
        queryClient.setQueryData<Upload[]>(['uploads', 'in-progress'], (old = []) => [
          newUpload,
          ...old,
        ]);
      }
    },
  });
}

/**
 * Update upload progress
 */
export function useUpdateUploadProgress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      uploadId,
      uploadedBytes,
    }: {
      uploadId: string;
      uploadedBytes: number;
    }) => {
      const response = await uploadService.updateProgress(uploadId, {
        uploaded_bytes: uploadedBytes,
      });
      if (!response.success) {
        throw new Error(response.error);
      }
      return response.data;
    },
    onMutate: async ({ uploadId, uploadedBytes }) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ['uploads', uploadId] });

      const previousUpload = queryClient.getQueryData<Upload>(['uploads', uploadId]);

      queryClient.setQueryData<Upload>(['uploads', uploadId], (old) =>
        old ? { ...old, uploaded_bytes: uploadedBytes } : old
      );

      return { previousUpload };
    },
    onError: (_, { uploadId }, context) => {
      if (context?.previousUpload) {
        queryClient.setQueryData(['uploads', uploadId], context.previousUpload);
      }
    },
  });
}

/**
 * Mark upload as complete
 */
export function useCompleteUpload() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (uploadId: string) => {
      const response = await uploadService.markComplete(uploadId);
      if (!response.success) {
        throw new Error(response.error);
      }
      return response.data;
    },
    onSuccess: (completedUpload, uploadId) => {
      // Update upload cache
      queryClient.setQueryData(['uploads', uploadId], completedUpload);

      // Move from in-progress to completed
      queryClient.setQueryData<Upload[]>(['uploads', 'in-progress'], (old = []) =>
        old.filter((u) => u.id !== uploadId)
      );

      if (completedUpload) {
        queryClient.setQueryData<Upload[]>(['uploads', 'completed'], (old = []) => [
          completedUpload,
          ...old,
        ]);
      }
    },
  });
}

/**
 * Mark upload as failed
 */
export function useFailUpload() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (uploadId: string) => {
      const response = await uploadService.markFailed(uploadId);
      if (!response.success) {
        throw new Error(response.error);
      }
      return response.data;
    },
    onSuccess: (_, uploadId) => {
      // Remove from in-progress
      queryClient.setQueryData<Upload[]>(['uploads', 'in-progress'], (old = []) =>
        old.filter((u) => u.id !== uploadId)
      );
      queryClient.invalidateQueries({ queryKey: ['uploads', uploadId] });
    },
  });
}

/**
 * Delete an upload
 */
export function useDeleteUpload() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (uploadId: string) => {
      const response = await uploadService.delete(uploadId);
      if (!response.success) {
        throw new Error(response.error);
      }
      return response.data;
    },
    onSuccess: (_, uploadId) => {
      // Remove from all caches
      queryClient.removeQueries({ queryKey: ['uploads', uploadId] });
      queryClient.setQueryData<Upload[]>(['uploads', 'in-progress'], (old = []) =>
        old.filter((u) => u.id !== uploadId)
      );
      queryClient.setQueryData<Upload[]>(['uploads', 'completed'], (old = []) =>
        old.filter((u) => u.id !== uploadId)
      );
    },
  });
}

/**
 * Delete stale uploads (admin function)
 */
export function useDeleteStaleUploads() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (olderThanSec: number) => {
      const response = await uploadService.deleteStale(olderThanSec);
      if (!response.success) {
        throw new Error(response.error);
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['uploads'] });
    },
  });
}
