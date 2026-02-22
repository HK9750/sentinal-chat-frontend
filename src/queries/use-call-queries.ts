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
    staleTime: 5_000,
    refetchInterval: 10_000,
  });
}

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
        queryClient.setQueryData<Call[]>(['calls', 'active'], (old = []) => [
          newCall,
          ...old,
        ]);
        queryClient.invalidateQueries({
          queryKey: ['calls', { conversationId: newCall.conversation_id }],
        });
      }
    },
  });
}

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
      queryClient.setQueryData<Call[]>(['calls', 'active'], (old = []) =>
        old.filter((c) => c.id !== callId)
      );
      queryClient.invalidateQueries({ queryKey: ['calls', callId] });
    },
  });
}

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
    staleTime: 1_000,
    refetchInterval: 5_000,
  });
}

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
