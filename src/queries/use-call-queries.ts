import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  callService,
  CreateCallRequest,
  EndCallRequest,
  UpdateParticipantMuteRequest,
  UpdateParticipantStatusRequest,
  RecordQualityMetricRequest,
} from '@/services/call-service';
import { Call, CallParticipant } from '@/types';

/**
 * Fetch a single call by ID
 */
export function useCall(callId: string) {
  return useQuery({
    queryKey: ['calls', callId],
    queryFn: async () => {
      const response = await callService.getById(callId);
      if (!response.success) {
        throw new Error(response.error);
      }
      return response.data;
    },
    enabled: !!callId,
    staleTime: 10_000,
  });
}

/**
 * Fetch calls for a conversation
 */
export function useCalls(conversationId?: string) {
  return useQuery({
    queryKey: ['calls', { conversationId }],
    queryFn: async () => {
      const response = await callService.list(conversationId);
      if (!response.success) {
        throw new Error(response.error);
      }
      return response.data?.calls || [];
    },
    staleTime: 30_000,
  });
}

/**
 * Fetch active calls for a user
 */
export function useActiveCalls(userId: string) {
  return useQuery({
    queryKey: ['calls', 'active', userId],
    queryFn: async () => {
      const response = await callService.listActive(userId);
      if (!response.success) {
        throw new Error(response.error);
      }
      return response.data?.calls || [];
    },
    enabled: !!userId,
    staleTime: 5_000, // Active calls need frequent updates
    refetchInterval: 10_000, // Refetch every 10 seconds
  });
}

/**
 * Fetch missed calls for a user
 */
export function useMissedCalls(userId: string, since?: string) {
  return useQuery({
    queryKey: ['calls', 'missed', userId, since],
    queryFn: async () => {
      const response = await callService.listMissed(userId, since);
      if (!response.success) {
        throw new Error(response.error);
      }
      return response.data?.calls || [];
    },
    enabled: !!userId,
    staleTime: 60_000,
  });
}

/**
 * Fetch call participants
 */
export function useCallParticipants(callId: string) {
  return useQuery({
    queryKey: ['calls', callId, 'participants'],
    queryFn: async () => {
      const response = await callService.listParticipants(callId);
      if (!response.success) {
        throw new Error(response.error);
      }
      return response.data?.participants || [];
    },
    enabled: !!callId,
    staleTime: 5_000,
  });
}

/**
 * Create a new call
 */
export function useCreateCall() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateCallRequest) => {
      const response = await callService.create(data);
      if (!response.success) {
        throw new Error(response.error);
      }
      return response.data;
    },
    onSuccess: (newCall) => {
      if (newCall) {
        // Add to active calls cache
        queryClient.setQueryData<Call[]>(['calls', 'active'], (old = []) => [
          newCall,
          ...old,
        ]);
        // Invalidate conversation-specific calls
        queryClient.invalidateQueries({
          queryKey: ['calls', { conversationId: newCall.conversation_id }],
        });
      }
    },
  });
}

/**
 * Add a participant to a call
 */
export function useAddCallParticipant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ callId, userId }: { callId: string; userId: string }) => {
      const response = await callService.addParticipant(callId, { user_id: userId });
      if (!response.success) {
        throw new Error(response.error);
      }
      return response.data;
    },
    onSuccess: (_, { callId }) => {
      queryClient.invalidateQueries({
        queryKey: ['calls', callId, 'participants'],
      });
    },
  });
}

/**
 * Remove a participant from a call
 */
export function useRemoveCallParticipant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ callId, userId }: { callId: string; userId: string }) => {
      const response = await callService.removeParticipant(callId, userId);
      if (!response.success) {
        throw new Error(response.error);
      }
      return response.data;
    },
    onSuccess: (_, { callId }) => {
      queryClient.invalidateQueries({
        queryKey: ['calls', callId, 'participants'],
      });
    },
  });
}

/**
 * Update participant status (INVITED, JOINED, LEFT)
 */
export function useUpdateParticipantStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      callId,
      userId,
      status,
    }: {
      callId: string;
      userId: string;
      status: UpdateParticipantStatusRequest['status'];
    }) => {
      const response = await callService.updateParticipantStatus(callId, userId, {
        status,
      });
      if (!response.success) {
        throw new Error(response.error);
      }
      return response.data;
    },
    onSuccess: (_, { callId }) => {
      queryClient.invalidateQueries({
        queryKey: ['calls', callId, 'participants'],
      });
    },
  });
}

/**
 * Update participant mute state
 */
export function useUpdateParticipantMute() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      callId,
      userId,
      audioMuted,
      videoMuted,
    }: {
      callId: string;
      userId: string;
      audioMuted: boolean;
      videoMuted: boolean;
    }) => {
      const response = await callService.updateParticipantMute(callId, userId, {
        audio_muted: audioMuted,
        video_muted: videoMuted,
      });
      if (!response.success) {
        throw new Error(response.error);
      }
      return response.data;
    },
    onMutate: async ({ callId, userId, audioMuted, videoMuted }) => {
      // Optimistic update
      await queryClient.cancelQueries({
        queryKey: ['calls', callId, 'participants'],
      });

      const previousParticipants = queryClient.getQueryData<CallParticipant[]>([
        'calls',
        callId,
        'participants',
      ]);

      queryClient.setQueryData<CallParticipant[]>(
        ['calls', callId, 'participants'],
        (old = []) =>
          old.map((p) =>
            p.user_id === userId
              ? { ...p, audio_muted: audioMuted, video_muted: videoMuted }
              : p
          )
      );

      return { previousParticipants };
    },
    onError: (_, { callId }, context) => {
      if (context?.previousParticipants) {
        queryClient.setQueryData(
          ['calls', callId, 'participants'],
          context.previousParticipants
        );
      }
    },
  });
}

/**
 * Mark a call as connected
 */
export function useMarkCallConnected() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (callId: string) => {
      const response = await callService.markConnected(callId);
      if (!response.success) {
        throw new Error(response.error);
      }
      return response.data;
    },
    onSuccess: (_, callId) => {
      queryClient.invalidateQueries({ queryKey: ['calls', callId] });
      queryClient.invalidateQueries({ queryKey: ['calls', 'active'] });
    },
  });
}

/**
 * End a call
 */
export function useEndCall() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      callId,
      reason,
    }: {
      callId: string;
      reason: EndCallRequest['reason'];
    }) => {
      const response = await callService.end(callId, { reason });
      if (!response.success) {
        throw new Error(response.error);
      }
      return response.data;
    },
    onSuccess: (_, { callId }) => {
      // Remove from active calls
      queryClient.setQueryData<Call[]>(['calls', 'active'], (old = []) =>
        old.filter((c) => c.id !== callId)
      );
      queryClient.invalidateQueries({ queryKey: ['calls', callId] });
    },
  });
}

/**
 * Get call duration
 */
export function useCallDuration(callId: string) {
  return useQuery({
    queryKey: ['calls', callId, 'duration'],
    queryFn: async () => {
      const response = await callService.getDuration(callId);
      if (!response.success) {
        throw new Error(response.error);
      }
      return response.data?.duration || 0;
    },
    enabled: !!callId,
    staleTime: 1_000, // Duration changes frequently during active calls
    refetchInterval: 5_000,
  });
}

/**
 * Record call quality metrics
 */
export function useRecordQualityMetric() {
  return useMutation({
    mutationFn: async (data: RecordQualityMetricRequest) => {
      const response = await callService.recordQualityMetric(data);
      if (!response.success) {
        throw new Error(response.error);
      }
      return response.data;
    },
  });
}

/**
 * Accept an incoming call (convenience hook)
 * Updates participant status to JOINED
 */
export function useAcceptCall() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (callId: string) => {
      const response = await callService.markConnected(callId);
      if (!response.success) {
        throw new Error(response.error);
      }
      return response.data;
    },
    onSuccess: (_, callId) => {
      queryClient.invalidateQueries({ queryKey: ['calls', callId] });
      queryClient.invalidateQueries({ queryKey: ['calls', 'active'] });
    },
  });
}

/**
 * Decline an incoming call (convenience hook)
 * Ends the call with DECLINED reason
 */
export function useDeclineCall() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (callId: string) => {
      const response = await callService.end(callId, { reason: 'DECLINED' });
      if (!response.success) {
        throw new Error(response.error);
      }
      return response.data;
    },
    onSuccess: (_, callId) => {
      queryClient.setQueryData<Call[]>(['calls', 'active'], (old = []) =>
        old.filter((c) => c.id !== callId)
      );
      queryClient.invalidateQueries({ queryKey: ['calls', callId] });
      queryClient.invalidateQueries({ queryKey: ['calls', 'missed'] });
    },
  });
}
