import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  broadcastService,
  CreateBroadcastRequest,
  UpdateBroadcastRequest,
  BulkRecipientsRequest,
} from '@/services/broadcast-service';
import { Broadcast, BroadcastRecipient } from '@/types';

export function useBroadcast(broadcastId: string) {
  return useQuery({
    queryKey: ['broadcasts', broadcastId],
    queryFn: async () => {
      const response = await broadcastService.getById(broadcastId);
      if (!response.success) {
        throw new Error(response.error);
      }
      return response.data;
    },
    enabled: !!broadcastId,
    staleTime: 30_000,
  });
}

export function useBroadcasts(ownerId: string) {
  return useQuery({
    queryKey: ['broadcasts', 'list', ownerId],
    queryFn: async () => {
      const response = await broadcastService.list(ownerId);
      if (!response.success) {
        throw new Error(response.error);
      }
      return response.data?.broadcasts || [];
    },
    enabled: !!ownerId,
    staleTime: 60_000,
  });
}

export function useSearchBroadcasts(ownerId: string, query: string) {
  return useQuery({
    queryKey: ['broadcasts', 'search', ownerId, query],
    queryFn: async () => {
      const response = await broadcastService.search(ownerId, query);
      if (!response.success) {
        throw new Error(response.error);
      }
      return response.data?.broadcasts || [];
    },
    enabled: !!ownerId && query.length > 0,
    staleTime: 30_000,
  });
}

export function useBroadcastRecipients(broadcastId: string) {
  return useQuery({
    queryKey: ['broadcasts', broadcastId, 'recipients'],
    queryFn: async () => {
      const response = await broadcastService.listRecipients(broadcastId);
      if (!response.success) {
        throw new Error(response.error);
      }
      return response.data?.recipients || [];
    },
    enabled: !!broadcastId,
    staleTime: 60_000,
  });
}

export function useBroadcastRecipientCount(broadcastId: string) {
  return useQuery({
    queryKey: ['broadcasts', broadcastId, 'recipients', 'count'],
    queryFn: async () => {
      const response = await broadcastService.getRecipientCount(broadcastId);
      if (!response.success) {
        throw new Error(response.error);
      }
      return response.data?.count || 0;
    },
    enabled: !!broadcastId,
    staleTime: 60_000,
  });
}

export function useCreateBroadcast() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateBroadcastRequest) => {
      const response = await broadcastService.create(data);
      if (!response.success) {
        throw new Error(response.error);
      }
      return response.data;
    },
    onSuccess: (newBroadcast) => {
      if (newBroadcast) {
        queryClient.setQueryData<Broadcast[]>(['broadcasts', 'list'], (old = []) => [
          newBroadcast,
          ...old,
        ]);
      }
    },
  });
}

export function useUpdateBroadcast() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      broadcastId,
      data,
    }: {
      broadcastId: string;
      data: UpdateBroadcastRequest;
    }) => {
      const response = await broadcastService.update(broadcastId, data);
      if (!response.success) {
        throw new Error(response.error);
      }
      return response.data;
    },
    onSuccess: (updatedBroadcast, { broadcastId }) => {
      queryClient.setQueryData(['broadcasts', broadcastId], updatedBroadcast);
      queryClient.setQueryData<Broadcast[]>(['broadcasts', 'list'], (old = []) =>
        old.map((b) => (b.id === broadcastId ? updatedBroadcast! : b))
      );
    },
  });
}

export function useDeleteBroadcast() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (broadcastId: string) => {
      const response = await broadcastService.delete(broadcastId);
      if (!response.success) {
        throw new Error(response.error);
      }
      return response.data;
    },
    onSuccess: (_, broadcastId) => {
      queryClient.setQueryData<Broadcast[]>(['broadcasts', 'list'], (old = []) =>
        old.filter((b) => b.id !== broadcastId)
      );
      queryClient.removeQueries({ queryKey: ['broadcasts', broadcastId] });
    },
  });
}

export function useAddBroadcastRecipient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      broadcastId,
      userId,
    }: {
      broadcastId: string;
      userId: string;
    }) => {
      const response = await broadcastService.addRecipient(broadcastId, {
        user_id: userId,
      });
      if (!response.success) {
        throw new Error(response.error);
      }
      return response.data;
    },
    onSuccess: (_, { broadcastId }) => {
      queryClient.invalidateQueries({
        queryKey: ['broadcasts', broadcastId, 'recipients'],
      });
      queryClient.invalidateQueries({
        queryKey: ['broadcasts', broadcastId, 'recipients', 'count'],
      });
    },
  });
}

export function useRemoveBroadcastRecipient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      broadcastId,
      userId,
    }: {
      broadcastId: string;
      userId: string;
    }) => {
      const response = await broadcastService.removeRecipient(broadcastId, userId);
      if (!response.success) {
        throw new Error(response.error);
      }
      return response.data;
    },
    onMutate: async ({ broadcastId, userId }) => {
      await queryClient.cancelQueries({
        queryKey: ['broadcasts', broadcastId, 'recipients'],
      });

      const previousRecipients = queryClient.getQueryData<BroadcastRecipient[]>([
        'broadcasts',
        broadcastId,
        'recipients',
      ]);

      queryClient.setQueryData<BroadcastRecipient[]>(
        ['broadcasts', broadcastId, 'recipients'],
        (old = []) => old.filter((r) => r.user_id !== userId)
      );

      return { previousRecipients };
    },
    onError: (_, { broadcastId }, context) => {
      if (context?.previousRecipients) {
        queryClient.setQueryData(
          ['broadcasts', broadcastId, 'recipients'],
          context.previousRecipients
        );
      }
    },
    onSuccess: (_, { broadcastId }) => {
      queryClient.invalidateQueries({
        queryKey: ['broadcasts', broadcastId, 'recipients', 'count'],
      });
    },
  });
}

export function useBulkAddBroadcastRecipients() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      broadcastId,
      userIds,
    }: {
      broadcastId: string;
      userIds: string[];
    }) => {
      const response = await broadcastService.bulkAddRecipients(broadcastId, {
        user_ids: userIds,
      });
      if (!response.success) {
        throw new Error(response.error);
      }
      return response.data;
    },
    onSuccess: (_, { broadcastId }) => {
      queryClient.invalidateQueries({
        queryKey: ['broadcasts', broadcastId, 'recipients'],
      });
      queryClient.invalidateQueries({
        queryKey: ['broadcasts', broadcastId, 'recipients', 'count'],
      });
    },
  });
}

export function useBulkRemoveBroadcastRecipients() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      broadcastId,
      userIds,
    }: {
      broadcastId: string;
      userIds: string[];
    }) => {
      const response = await broadcastService.bulkRemoveRecipients(broadcastId, {
        user_ids: userIds,
      });
      if (!response.success) {
        throw new Error(response.error);
      }
      return response.data;
    },
    onSuccess: (_, { broadcastId }) => {
      queryClient.invalidateQueries({
        queryKey: ['broadcasts', broadcastId, 'recipients'],
      });
      queryClient.invalidateQueries({
        queryKey: ['broadcasts', broadcastId, 'recipients', 'count'],
      });
    },
  });
}

export function useIsRecipient(broadcastId: string, userId: string) {
  return useQuery({
    queryKey: ['broadcasts', broadcastId, 'recipients', userId],
    queryFn: async () => {
      const response = await broadcastService.checkRecipient(broadcastId, userId);
      if (!response.success) {
        throw new Error(response.error);
      }
      return response.data?.is_recipient || false;
    },
    enabled: !!broadcastId && !!userId,
    staleTime: 60_000,
  });
}
