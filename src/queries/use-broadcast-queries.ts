'use client';

import { useQuery } from '@tanstack/react-query';
import { getBroadcastDetail, listBroadcasts } from '@/services/broadcast-service';
import { queryKeys } from '@/queries/query-keys';

export function useBroadcastsQuery() {
  return useQuery({
    queryKey: queryKeys.broadcasts,
    queryFn: () => listBroadcasts(),
  });
}

export const useBroadcasts = useBroadcastsQuery;

export function useBroadcastDetailQuery(broadcastId?: string | null) {
  return useQuery({
    queryKey: broadcastId ? queryKeys.broadcast(broadcastId) : ['broadcasts', 'empty'],
    queryFn: () => getBroadcastDetail(broadcastId as string),
    enabled: Boolean(broadcastId),
  });
}

export const useBroadcastDetail = useBroadcastDetailQuery;
