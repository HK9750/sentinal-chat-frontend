'use client';

import { createContext, useContext, useEffect, useRef, useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { env } from '@/config/env';
import { useAuthStore } from '@/stores/auth-store';
import { useChatStore } from '@/stores/chat-store';
import { useCallStore } from '@/stores/call-store';
import type { WebSocketEvent, WebSocketTypingEvent } from '@/types';
import type { Call, CallType } from '@/types/call';

const BASE_RECONNECT_MS = 1_000;
const MAX_RECONNECT_MS = 30_000;
const HEARTBEAT_INTERVAL_MS = 25_000;

interface BackendCallSignaling {
  type: string;
  call_id: string;
  from_id: string;
  to_id: string;
  signal_type: string;
  data: string;
  conversation_id?: string;
}

interface SocketContextType {
  sendTypingStart: (conversationId: string) => void;
  sendTypingStop: (conversationId: string) => void;
  sendReadReceipt: (messageId: string) => void;

  sendCallOffer: (callId: string, participantId: string, sdp: RTCSessionDescriptionInit) => void;
  sendCallAnswer: (callId: string, participantId: string, sdp: RTCSessionDescriptionInit) => void;
  sendIceCandidate: (callId: string, participantId: string, candidate: RTCIceCandidate) => void;
  sendCallEnd: (callId: string, reason?: string) => void;

  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType | null>(null);

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within SocketProvider');
  }
  return context;
}

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const attemptRef = useRef(0);
  const [isConnected, setIsConnected] = useState(false);

  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const tokens = useAuthStore((state) => state.tokens);

  const addTypingUser = useChatStore((state) => state.addTypingUser);
  const removeTypingUser = useChatStore((state) => state.removeTypingUser);

  const setIncomingCall = useCallStore((state) => state.setIncomingCall);
  const endCall = useCallStore((state) => state.endCall);

  const send = useCallback((data: Record<string, unknown>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  const clearHeartbeat = useCallback(() => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
  }, []);

  const startHeartbeat = useCallback(() => {
    clearHeartbeat();
    heartbeatRef.current = setInterval(() => {
      send({ type: 'ping' });
    }, HEARTBEAT_INTERVAL_MS);
  }, [send, clearHeartbeat]);

  const scheduleReconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) return;
    const delay = Math.min(BASE_RECONNECT_MS * 2 ** attemptRef.current, MAX_RECONNECT_MS);
    attemptRef.current += 1;
    reconnectTimeoutRef.current = setTimeout(() => {
      reconnectTimeoutRef.current = null;
      connectRef.current?.();
    }, delay);
  }, []);

  const connectRef = useRef<() => void>(undefined);

  const connect = useCallback(() => {
    const accessToken = tokens?.access_token;
    if (!accessToken) return;
    if (
      wsRef.current?.readyState === WebSocket.OPEN ||
      wsRef.current?.readyState === WebSocket.CONNECTING
    ) {
      return;
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    const wsUrl = `${env.SOCKET_URL}/v1/ws?token=${accessToken}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      setIsConnected(true);
      attemptRef.current = 0;
      startHeartbeat();
    };

    ws.onmessage = (event) => {
      const rawParts = (event.data as string).split('\n');

      for (const rawPart of rawParts) {
        const trimmed = rawPart.trim();
        if (!trimmed) continue;

        let data: WebSocketEvent & Record<string, unknown>;
        try {
          data = JSON.parse(trimmed) as WebSocketEvent & Record<string, unknown>;
        } catch (error) {
          console.warn('Error parsing WebSocket message part:', error, trimmed);
          continue;
        }

        switch (data.type) {
          case 'message:new': {
            const convId = data.conversation_id as string | undefined;
            queryClient.invalidateQueries({
              queryKey: ['conversations', convId, 'messages'],
            });
            queryClient.invalidateQueries({
              queryKey: ['conversations', 'list'],
            });
            break;
          }

          case 'message:read': {
            const convId = data.conversation_id as string | undefined;
            queryClient.invalidateQueries({
              queryKey: ['conversations', convId, 'messages'],
            });
            break;
          }

          case 'message:delivered': {
            const convId = data.conversation_id as string | undefined;
            queryClient.invalidateQueries({
              queryKey: ['conversations', convId, 'messages'],
            });
            break;
          }

          case 'typing:started': {
            const tp = data as unknown as WebSocketTypingEvent['payload'];
            addTypingUser(tp.conversation_id, tp.user_id);
            break;
          }

          case 'typing:stopped': {
            const tp = data as unknown as WebSocketTypingEvent['payload'];
            removeTypingUser(tp.conversation_id, tp.user_id);
            break;
          }

          case 'presence:online':
          case 'presence:offline': {
            queryClient.invalidateQueries({ queryKey: ['conversations', 'list'] });
            break;
          }

          case 'call:offer': {
            const sig = data as unknown as BackendCallSignaling;
            const callType: CallType =
              sig.data && sig.data.includes('m=video') ? 'VIDEO' : 'AUDIO';
            const incomingCall: Call = {
              id: sig.call_id,
              conversation_id: sig.conversation_id || '',
              type: callType,
              status: 'RINGING',
              initiator_id: sig.from_id,
              created_at: new Date().toISOString(),
            };
            setIncomingCall(incomingCall, sig.from_id, '', sig.data);
            break;
          }

          case 'call:answer': {
            const sig = data as unknown as BackendCallSignaling;
            const pc = useCallStore.getState().peerConnections.get(sig.from_id);
            if (pc && sig.data) {
              pc.setRemoteDescription(
                new RTCSessionDescription({ type: 'answer', sdp: sig.data })
              );
            }
            break;
          }

          case 'call:ice': {
            const sig = data as unknown as BackendCallSignaling;
            const pc = useCallStore.getState().peerConnections.get(sig.from_id);
            if (pc && sig.data) {
              try {
                const parsed = JSON.parse(sig.data) as RTCIceCandidateInit;
                pc.addIceCandidate(new RTCIceCandidate(parsed));
              } catch {
                pc.addIceCandidate(new RTCIceCandidate({ candidate: sig.data }));
              }
            }
            break;
          }

          case 'call:ended': {
            endCall();
            queryClient.invalidateQueries({ queryKey: ['calls'] });
            break;
          }

          case 'pong':
            break;

          default:
            break;
        }
      }
    };

    ws.onerror = () => {};

    ws.onclose = () => {
      setIsConnected(false);
      clearHeartbeat();
      wsRef.current = null;

      if (useAuthStore.getState().isAuthenticated && useAuthStore.getState().tokens?.access_token) {
        scheduleReconnect();
      }
    };

    wsRef.current = ws;
  }, [
    tokens?.access_token,
    queryClient,
    addTypingUser,
    removeTypingUser,
    setIncomingCall,
    endCall,
    startHeartbeat,
    clearHeartbeat,
    scheduleReconnect,
  ]);

  // Keep connectRef up to date
  connectRef.current = connect;

  useEffect(() => {
    if (isAuthenticated && tokens?.access_token) {
      connect();
    }

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      clearHeartbeat();
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [isAuthenticated, tokens?.access_token, connect, clearHeartbeat]);

  const sendTypingStart = useCallback(
    (conversationId: string) => send({ type: 'typing:start', conversation_id: conversationId }),
    [send]
  );

  const sendTypingStop = useCallback(
    (conversationId: string) => send({ type: 'typing:stop', conversation_id: conversationId }),
    [send]
  );

  const sendReadReceipt = useCallback(
    (messageId: string) => send({ type: 'read', message_id: messageId }),
    [send]
  );

  const sendCallOffer = useCallback(
    (callId: string, participantId: string, sdp: RTCSessionDescriptionInit) =>
      send({ type: 'call:offer', call_id: callId, participant_id: participantId, sdp: sdp.sdp }),
    [send]
  );

  const sendCallAnswer = useCallback(
    (callId: string, participantId: string, sdp: RTCSessionDescriptionInit) =>
      send({ type: 'call:answer', call_id: callId, participant_id: participantId, sdp: sdp.sdp }),
    [send]
  );

  const sendIceCandidate = useCallback(
    (callId: string, participantId: string, candidate: RTCIceCandidate) =>
      send({
        type: 'call:ice',
        call_id: callId,
        participant_id: participantId,
        candidate: candidate.toJSON(),
      }),
    [send]
  );

  const sendCallEnd = useCallback(
    (callId: string, reason?: string) =>
      send({ type: 'call:end', call_id: callId, reason: reason || 'COMPLETED' }),
    [send]
  );

  return (
    <SocketContext.Provider
      value={{
        sendTypingStart,
        sendTypingStop,
        sendReadReceipt,
        sendCallOffer,
        sendCallAnswer,
        sendIceCandidate,
        sendCallEnd,
        isConnected,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}
