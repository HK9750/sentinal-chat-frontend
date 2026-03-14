'use client';

import { useCallback } from 'react';
import { createRequestId } from '@/lib/crypto';
import { buildCallAnswerFrame, buildCallEndFrame, buildCallIceFrame, buildCallOfferFrame, buildCallStartFrame } from '@/services/call-service';
import { useSocket } from '@/providers/socket-provider';
import type { CallSignalPayload, CallType } from '@/types';

export function useCallSignaling(conversationId?: string | null) {
  const socket = useSocket();

  const startCall = useCallback(
    (type: CallType) => {
      if (!conversationId) {
        return;
      }

      socket.send(buildCallStartFrame(conversationId, type, createRequestId('call-start')));
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
