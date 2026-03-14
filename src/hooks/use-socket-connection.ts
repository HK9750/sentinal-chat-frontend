'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { env } from '@/config/env';
import { SOCKET_EVENT, WS_HEARTBEAT_INTERVAL, WS_RECONNECT_BASE_DELAY, WS_RECONNECT_MAX_DELAY } from '@/lib/constants';
import { buildSocketUrl, parseSocketEnvelope, serializeSocketFrame } from '@/services/socket-service';
import { createRequestId } from '@/lib/crypto';
import { useAuthStore } from '@/stores/auth-store';
import type { ClientSocketFrame, SocketEnvelope } from '@/types';

type SocketState = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'disconnected';

export function useSocketConnection() {
  const token = useAuthStore((state) => state.tokens?.access_token);
  const [state, setState] = useState<SocketState>('idle');
  const [lastEnvelope, setLastEnvelope] = useState<SocketEnvelope | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef<number | null>(null);
  const heartbeatTimerRef = useRef<number | null>(null);
  const messageQueueRef = useRef<string[]>([]);
  const listenersRef = useRef(new Set<(envelope: SocketEnvelope) => void>());
  const connectRef = useRef<() => void>(() => undefined);
  const manualCloseRef = useRef(false);

  const flushQueue = useCallback(() => {
    if (socketRef.current?.readyState !== WebSocket.OPEN) {
      return;
    }

    while (messageQueueRef.current.length > 0) {
      const payload = messageQueueRef.current.shift();

      if (!payload) {
        continue;
      }

      socketRef.current.send(payload);
    }
  }, []);

  const clearTimers = useCallback(() => {
    if (reconnectTimerRef.current) {
      window.clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }

    if (heartbeatTimerRef.current) {
      window.clearInterval(heartbeatTimerRef.current);
      heartbeatTimerRef.current = null;
    }
  }, []);

  const startHeartbeat = useCallback(() => {
    clearTimers();
    heartbeatTimerRef.current = window.setInterval(() => {
      const frame: ClientSocketFrame = {
        type: SOCKET_EVENT.ping,
        request_id: createRequestId('ping'),
      };

      if (socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(serializeSocketFrame(frame));
      }
    }, WS_HEARTBEAT_INTERVAL);
  }, [clearTimers]);

  const scheduleReconnect = useCallback(() => {
    clearTimers();
    reconnectAttemptRef.current += 1;
    const delay = Math.min(
      WS_RECONNECT_MAX_DELAY,
      WS_RECONNECT_BASE_DELAY * 2 ** (reconnectAttemptRef.current - 1)
    );

    setState('reconnecting');
    reconnectTimerRef.current = window.setTimeout(() => {
      connectRef.current();
    }, delay);
  }, [clearTimers]);

  const connect = useCallback(() => {
    if (!token) {
      setState('idle');
      return;
    }

    manualCloseRef.current = false;

    if (socketRef.current?.readyState === WebSocket.OPEN || socketRef.current?.readyState === WebSocket.CONNECTING) {
      return;
    }

    setState('connecting');

    const socket = new WebSocket(buildSocketUrl(env.socketUrl, token));
    socketRef.current = socket;

    socket.onopen = () => {
      reconnectAttemptRef.current = 0;
      setState('connected');
      startHeartbeat();
      flushQueue();
    };

    socket.onmessage = (event) => {
      const envelope = parseSocketEnvelope(event.data);
      setLastEnvelope(envelope);

      for (const listener of listenersRef.current) {
        listener(envelope);
      }
    };

    socket.onclose = () => {
      setState('disconnected');

       if (manualCloseRef.current || !token) {
        return;
      }

      scheduleReconnect();
    };

    socket.onerror = () => {
      socket.close();
    };
  }, [flushQueue, scheduleReconnect, startHeartbeat, token]);

  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  const disconnect = useCallback(() => {
    clearTimers();
    manualCloseRef.current = true;
    socketRef.current?.close();
    socketRef.current = null;
    setState('disconnected');
  }, [clearTimers]);

  const send = useCallback((frame: ClientSocketFrame) => {
    const payload = serializeSocketFrame(frame);

    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(payload);
      return frame.request_id ?? null;
    }

    messageQueueRef.current.push(payload);
    return frame.request_id ?? null;
  }, []);

  const subscribe = useCallback((listener: (envelope: SocketEnvelope) => void) => {
    listenersRef.current.add(listener);
    return () => {
      listenersRef.current.delete(listener);
    };
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      connect();
    }, 0);

    return () => {
      window.clearTimeout(timer);
      disconnect();
    };
  }, [connect, disconnect]);

  return useMemo(
    () => ({
      state,
      connected: state === 'connected',
      lastEnvelope,
      send,
      connect,
      disconnect,
      subscribe,
    }),
    [connect, disconnect, lastEnvelope, send, state, subscribe]
  );
}
