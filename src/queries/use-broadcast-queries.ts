import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  broadcastService,
  CreateBroadcastRequest,
  UpdateBroadcastRequest,
  BulkRecipientsRequest,
} from '@/services/broadcast-service';
import { Broadcast, BroadcastRecipient } from '@/types';

/**
 * Fetch a single broadcast by ID
 */
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

/**
 * Fetch all broadcasts for a specific owner
 */
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

/**
 * Search broadcasts for a specific owner
 */
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

/**
 * Fetch broadcast recipients
 */
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

/**
 * Fetch broadcast recipient count
 */
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

/**
 * Create a new broadcast
 */
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
        // Optimistically add to list
        queryClient.setQueryData<Broadcast[]>(['broadcasts', 'list'], (old = []) => [
          newBroadcast,
          ...old,
        ]);
      }
    },
  });
}

/**
 * Update a broadcast
 */
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
      // Update individual broadcast cache
      queryClient.setQueryData(['broadcasts', broadcastId], updatedBroadcast);
      // Update list cache
      queryClient.setQueryData<Broadcast[]>(['broadcasts', 'list'], (old = []) =>
        old.map((b) => (b.id === broadcastId ? updatedBroadcast! : b))
      );
    },
  });
}

/**
 * Delete a broadcast
 */
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
      // Remove from list cache
      queryClient.setQueryData<Broadcast[]>(['broadcasts', 'list'], (old = []) =>
        old.filter((b) => b.id !== broadcastId)
      );
      // Remove individual cache
      queryClient.removeQueries({ queryKey: ['broadcasts', broadcastId] });
    },
  });
}

/**
 * Add a recipient to a broadcast
 */
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

/**
 * Remove a recipient from a broadcast
 */
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
      // Optimistic update
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

/**
 * Bulk add recipients to a broadcast
 */
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

/**
 * Bulk remove recipients from a broadcast
 */
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

/**
 * Check if a user is a recipient of a broadcast
 */
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
