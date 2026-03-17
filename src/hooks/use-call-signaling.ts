'use client';

import { useCallback } from 'react';
import { createRequestId } from '@/lib/request-id';
import { buildCallAnswerFrame, buildCallEndFrame, buildCallIceFrame, buildCallOfferFrame, buildCallStartFrame } from '@/services/call-service';
import { useSocket } from '@/providers/socket-provider';
import type { CallSignalPayload, CallType } from '@/types';

interface CallStartResponse {
  call_id: string;
  type: CallType;
  initiated_by: string;
  started_at?: string;
  participant_ids?: string[];
}

export function useCallSignaling(conversationId?: string | null) {
  const socket = useSocket();

  const startCall = useCallback(
    async (type: CallType): Promise<CallStartResponse | null> => {
      if (!conversationId) {
        return null;
      }

      const requestId = createRequestId('call-start');

      return new Promise((resolve, reject) => {
        const timeout = window.setTimeout(() => {
          unsubscribe();
          reject(new Error('Call start timed out.'));
        }, 10000);

        const unsubscribe = socket.subscribe((envelope) => {
          if (envelope.request_id !== requestId) {
            return;
          }

          if (envelope.type === 'error') {
            window.clearTimeout(timeout);
            unsubscribe();
            reject(new Error((envelope.data as { message?: string } | undefined)?.message ?? 'Call could not be started.'));
            return;
          }

          if (envelope.type !== 'call:incoming') {
            return;
          }

          window.clearTimeout(timeout);
          unsubscribe();
          resolve(envelope.data as CallStartResponse);
        });

        socket.send(buildCallStartFrame(conversationId, type, requestId));
      });
    },
    [conversationId, socket]
  );

  const sendOffer = useCallback(
    (callId: string, payload: CallSignalPayload) => {
      if (!conversationId) {
        return;
      }

      socket.send(buildCallOfferFrame(conversationId, callId, payload, createRequestId('call-offer')));
    },
    [conversationId, socket]
  );

  const sendAnswer = useCallback(
    (callId: string, payload: CallSignalPayload) => {
      if (!conversationId) {
        return;
      }

      socket.send(buildCallAnswerFrame(conversationId, callId, payload, createRequestId('call-answer')));
    },
    [conversationId, socket]
  );

  const sendIceCandidate = useCallback(
    (callId: string, payload: CallSignalPayload) => {
      if (!conversationId) {
        return;
      }

      socket.send(buildCallIceFrame(conversationId, callId, payload, createRequestId('call-ice')));
    },
    [conversationId, socket]
  );

  const endCall = useCallback(
    (callId: string, reason = 'completed') => {
      socket.send(buildCallEndFrame(callId, reason, conversationId ?? undefined, createRequestId('call-end')));
    },
    [conversationId, socket]
  );

  return {
    startCall,
    sendOffer,
    sendAnswer,
    sendIceCandidate,
    endCall,
  };
}
