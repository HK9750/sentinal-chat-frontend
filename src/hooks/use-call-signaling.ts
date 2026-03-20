'use client';

import { useCallback, useEffect, useRef } from 'react';
import { env } from '@/config/env';
import { createRequestId } from '@/lib/request-id';
import {
  buildCallAnswerFrame,
  buildCallEndFrame,
  buildCallIceFrame,
  buildCallOfferFrame,
  buildCallStartFrame,
  buildIceRestartFrame,
  CallError,
  createCallTimeout,
} from '@/services/call-service';
import { useSocket } from '@/providers/socket-provider';
import type { CallSignalPayload, CallType } from '@/types';

interface CallStartResponse {
  call_id: string;
  type: CallType;
  initiated_by: string;
  started_at?: string;
  participant_ids?: string[];
}

interface UseCallSignalingOptions {
  onCallTimeout?: () => void;
  onSignalingError?: (error: CallError) => void;
}

export function useCallSignaling(
  conversationId?: string | null,
  options: UseCallSignalingOptions = {}
) {
  const socket = useSocket();
  const callTimeoutRef = useRef<{ clear: () => void } | null>(null);
  const pendingCandidatesRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const pendingStartUnsubscribeRef = useRef<(() => void) | null>(null);

  // Clear any existing timeout
  const clearCallTimeout = useCallback(() => {
    if (callTimeoutRef.current) {
      callTimeoutRef.current.clear();
      callTimeoutRef.current = null;
    }

    if (pendingStartUnsubscribeRef.current) {
      pendingStartUnsubscribeRef.current();
      pendingStartUnsubscribeRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      clearCallTimeout();
    };
  }, [clearCallTimeout]);

  // Start a call with timeout handling
  const startCall = useCallback(
    async (type: CallType): Promise<CallStartResponse | null> => {
      if (!conversationId) {
        return null;
      }

      const requestId = createRequestId('call-start');

      return new Promise((resolve, reject) => {
        clearCallTimeout();

        // Set up call timeout
        callTimeoutRef.current = createCallTimeout(() => {
          pendingStartUnsubscribeRef.current?.();
          pendingStartUnsubscribeRef.current = null;
          const error = new CallError('Call timed out - no response', 'CALL_TIMEOUT', false);
          options.onCallTimeout?.();
          reject(error);
        }, env.callTimeoutMs);

        const unsubscribe = socket.subscribe((envelope) => {
          if (envelope.request_id !== requestId) {
            return;
          }

          if (envelope.type === 'error') {
            clearCallTimeout();
            unsubscribe();
            const error = new CallError(
              (envelope.data as { message?: string } | undefined)?.message ?? 'Call could not be started.',
              'SIGNALING_FAILED',
              false
            );
            options.onSignalingError?.(error);
            reject(error);
            return;
          }

          if (envelope.type !== 'call:incoming') {
            return;
          }

          clearCallTimeout();
          unsubscribe();
          resolve(envelope.data as CallStartResponse);
        });

        pendingStartUnsubscribeRef.current = unsubscribe;

        socket.send(buildCallStartFrame(conversationId, type, requestId));
      });
    },
    [conversationId, socket, clearCallTimeout, options]
  );

  // Send offer with queued ICE candidates
  const sendOffer = useCallback(
    (callId: string, payload: CallSignalPayload) => {
      if (!conversationId) {
        return;
      }

      socket.send(buildCallOfferFrame(conversationId, callId, payload, createRequestId('call-offer')));

      // Send any queued ICE candidates
      const queued = pendingCandidatesRef.current.get(callId);
      if (queued && queued.length > 0) {
        for (const candidate of queued) {
          socket.send(
            buildCallIceFrame(
              conversationId,
              callId,
              { to_user_id: payload.to_user_id, candidate },
              createRequestId('call-ice')
            )
          );
        }
        pendingCandidatesRef.current.delete(callId);
      }
    },
    [conversationId, socket]
  );

  // Send answer
  const sendAnswer = useCallback(
    (callId: string, payload: CallSignalPayload) => {
      if (!conversationId) {
        return;
      }

      // Clear timeout when call is answered
      clearCallTimeout();
      socket.send(buildCallAnswerFrame(conversationId, callId, payload, createRequestId('call-answer')));

      // Send any queued ICE candidates
      const queued = pendingCandidatesRef.current.get(callId);
      if (queued && queued.length > 0) {
        for (const candidate of queued) {
          socket.send(
            buildCallIceFrame(
              conversationId,
              callId,
              { to_user_id: payload.to_user_id, candidate },
              createRequestId('call-ice')
            )
          );
        }
        pendingCandidatesRef.current.delete(callId);
      }
    },
    [conversationId, socket, clearCallTimeout]
  );

  // Send ICE candidate (with queueing if remote description not set)
  const sendIceCandidate = useCallback(
    (callId: string, payload: CallSignalPayload, queue: boolean = false) => {
      if (!conversationId) {
        return;
      }

      if (queue && payload.candidate) {
        // Queue candidate if we should wait
        const existing = pendingCandidatesRef.current.get(callId) || [];
        existing.push(payload.candidate);
        pendingCandidatesRef.current.set(callId, existing);
        return;
      }

      socket.send(buildCallIceFrame(conversationId, callId, payload, createRequestId('call-ice')));
    },
    [conversationId, socket]
  );

  // Send ICE restart offer
  const sendIceRestart = useCallback(
    (callId: string, payload: CallSignalPayload) => {
      if (!conversationId) {
        return;
      }

      socket.send(buildIceRestartFrame(conversationId, callId, payload, createRequestId('call-ice-restart')));
    },
    [conversationId, socket]
  );

  // End call
  const endCall = useCallback(
    (callId: string, reason = 'completed') => {
      clearCallTimeout();
      pendingCandidatesRef.current.delete(callId);
      socket.send(buildCallEndFrame(callId, reason, conversationId ?? undefined, createRequestId('call-end')));
    },
    [conversationId, socket, clearCallTimeout]
  );

  // Reject incoming call
  const rejectCall = useCallback(
    (callId: string) => {
      endCall(callId, 'rejected');
    },
    [endCall]
  );

  // Miss call (timeout without answer)
  const missCall = useCallback(
    (callId: string) => {
      endCall(callId, 'missed');
    },
    [endCall]
  );

  // Cancel outgoing call
  const cancelCall = useCallback(
    (callId: string) => {
      endCall(callId, 'cancelled');
    },
    [endCall]
  );

  return {
    // Core signaling
    startCall,
    sendOffer,
    sendAnswer,
    sendIceCandidate,
    sendIceRestart,
    endCall,
    // Convenience methods
    rejectCall,
    missCall,
    cancelCall,
    clearCallTimeout,
  };
}
