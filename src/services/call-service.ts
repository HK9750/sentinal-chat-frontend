import { SOCKET_EVENT } from '@/lib/constants';
import type { CallSignalPayload, CallType, ClientSocketFrame } from '@/types';

export const DEFAULT_RTC_CONFIGURATION: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
  iceCandidatePoolSize: 10,
};

function serializeCallSignalPayload(payload: CallSignalPayload): Record<string, unknown> {
  return {
    to_user_id: payload.to_user_id,
    ...(payload.sdp ? { sdp: payload.sdp } : {}),
    ...(payload.candidate ? { candidate: payload.candidate } : {}),
  };
}

export function buildCallStartFrame(
  conversationId: string,
  type: CallType,
  requestId?: string
): ClientSocketFrame<{ type: CallType }> {
  return {
    type: SOCKET_EVENT.callStart,
    request_id: requestId,
    conversation_id: conversationId,
    data: { type },
  };
}

export function buildCallOfferFrame(
  conversationId: string,
  callId: string,
  payload: CallSignalPayload,
  requestId?: string
): ClientSocketFrame<Record<string, unknown>> {
  return {
    type: SOCKET_EVENT.callOffer,
    request_id: requestId,
    conversation_id: conversationId,
    call_id: callId,
    data: serializeCallSignalPayload(payload),
  };
}

export function buildCallAnswerFrame(
  conversationId: string,
  callId: string,
  payload: CallSignalPayload,
  requestId?: string
): ClientSocketFrame<Record<string, unknown>> {
  return {
    type: SOCKET_EVENT.callAnswer,
    request_id: requestId,
    conversation_id: conversationId,
    call_id: callId,
    data: serializeCallSignalPayload(payload),
  };
}

export function buildCallIceFrame(
  conversationId: string,
  callId: string,
  payload: CallSignalPayload,
  requestId?: string
): ClientSocketFrame<Record<string, unknown>> {
  return {
    type: SOCKET_EVENT.callIce,
    request_id: requestId,
    conversation_id: conversationId,
    call_id: callId,
    data: serializeCallSignalPayload(payload),
  };
}

export function buildCallEndFrame(
  callId: string,
  reason: string,
  conversationId?: string,
  requestId?: string
): ClientSocketFrame<{ reason: string }> {
  return {
    type: SOCKET_EVENT.callEnd,
    request_id: requestId,
    call_id: callId,
    conversation_id: conversationId,
    data: { reason },
  };
}
