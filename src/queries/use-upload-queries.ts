import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  uploadService,
  CreateUploadRequest,
  UpdateUploadProgressRequest,
} from '@/services/upload-service';
import { Upload } from '@/types';

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
    staleTime: 5_000,
  });
}

export function useUploads(uploaderId: string) {
  return useQuery({
    queryKey: ['uploads', { uploaderId }],
    queryFn: async () => {
      const response = await uploadService.list(uploaderId);
      if (!response.success) {
        throw new Error(response.error);
      }
      return response.data?.uploads || [];
    },
    enabled: !!uploaderId,
    staleTime: 30_000,
  });
}

export function useCompletedUploads(uploaderId: string) {
  return useQuery({
    queryKey: ['uploads', 'completed', uploaderId],
    queryFn: async () => {
      const response = await uploadService.listCompleted(uploaderId);
      if (!response.success) {
        throw new Error(response.error);
      }
      return response.data?.uploads || [];
    },
    enabled: !!uploaderId,
    staleTime: 60_000,
  });
}

export function useInProgressUploads(uploaderId: string) {
  return useQuery({
    queryKey: ['uploads', 'in-progress', uploaderId],
    queryFn: async () => {
      const response = await uploadService.listInProgress(uploaderId);
      if (!response.success) {
        throw new Error(response.error);
      }
      return response.data?.uploads || [];
    },
    enabled: !!uploaderId,
    staleTime: 10_000,
    refetchInterval: 15_000,
  });
}

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
        queryClient.setQueryData<Upload[]>(['uploads', 'in-progress'], (old = []) => [
          newUpload,
          ...old,
        ]);
      }
    },
  });
}

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
      queryClient.setQueryData(['uploads', uploadId], completedUpload);

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
      queryClient.setQueryData<Upload[]>(['uploads', 'in-progress'], (old = []) =>
        old.filter((u) => u.id !== uploadId)
      );
      queryClient.invalidateQueries({ queryKey: ['uploads', uploadId] });
    },
  });
}

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
