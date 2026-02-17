'use client';

import { createContext, useContext, useEffect, useRef, useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { env } from '@/config/env';
import { useAuthStore } from '@/stores/auth-store';
import { useChatStore } from '@/stores/chat-store';
import { WebSocketEvent, WebSocketTypingEvent } from '@/types';

interface SocketContextType {
  sendTypingStart: (conversationId: string) => void;
  sendTypingStop: (conversationId: string) => void;
  sendReadReceipt: (messageId: string) => void;
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
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const tokens = useAuthStore((state) => state.tokens);
  
  // Only typing users live in Zustand (real-time state)
  const addTypingUser = useChatStore((state) => state.addTypingUser);
  const removeTypingUser = useChatStore((state) => state.removeTypingUser);

  const connect = useCallback(() => {
    const accessToken = tokens?.access_token;
    if (!accessToken) return;

    // Clear any existing reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    const wsUrl = `${env.SOCKET_URL}/v1/ws?token=${accessToken}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('WebSocket connected');
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const data: WebSocketEvent = JSON.parse(event.data);

        switch (data.type) {
          case 'message:new': {
            const payload = data.payload as {
              message_id: string;
              conversation_id: string;
              sender_id: string;
            };
            // Invalidate queries to fetch new messages
            queryClient.invalidateQueries({
              queryKey: ['conversations', payload.conversation_id, 'messages'],
            });
            queryClient.invalidateQueries({
              queryKey: ['conversations', 'list'],
            });
            break;
          }

          case 'message:read': {
            const payload = data.payload as {
              message_id: string;
              conversation_id: string;
              reader_id: string;
            };
            // Invalidate to update read status
            queryClient.invalidateQueries({
              queryKey: ['conversations', payload.conversation_id, 'messages'],
            });
            break;
          }

          case 'message:delivered': {
            const payload = data.payload as {
              message_id: string;
              conversation_id: string;
            };
            // Invalidate to update delivery status
            queryClient.invalidateQueries({
              queryKey: ['conversations', payload.conversation_id, 'messages'],
            });
            break;
          }

          case 'typing:started': {
            const payload = (data as WebSocketTypingEvent).payload;
            addTypingUser(payload.conversation_id, payload.user_id);
            break;
          }

          case 'typing:stopped': {
            const payload = (data as WebSocketTypingEvent).payload;
            removeTypingUser(payload.conversation_id, payload.user_id);
            break;
          }

          case 'presence:online':
          case 'presence:offline': {
            // Could invalidate user queries if needed
            break;
          }

          case 'call:offer':
          case 'call:answer':
          case 'call:ice':
          case 'call:ended': {
            // Handle call events
            break;
          }

          default:
            console.log('Unknown WebSocket event:', data.type);
        }
      } catch (error) {
        console.warn('Error parsing WebSocket message:', error);
      }
    };

    ws.onerror = (error) => {
      console.warn('WebSocket error:', error);
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
    };

    wsRef.current = ws;
  }, [tokens?.access_token, queryClient, addTypingUser, removeTypingUser]);

  // Handle reconnection
  useEffect(() => {
    if (!isConnected && isAuthenticated && tokens?.access_token && !reconnectTimeoutRef.current) {
      reconnectTimeoutRef.current = setTimeout(() => {
        reconnectTimeoutRef.current = null;
        connect();
      }, 3000);
    }
  }, [isConnected, isAuthenticated, tokens?.access_token, connect]);

  // Initial connection
  useEffect(() => {
    if (isAuthenticated && tokens?.access_token) {
      connect();
    }

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [isAuthenticated, tokens?.access_token, connect]);

  const sendTypingStart = useCallback((conversationId: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'typing:start',
          conversation_id: conversationId,
        })
      );
    }
  }, []);

  const sendTypingStop = useCallback((conversationId: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'typing:stop',
          conversation_id: conversationId,
        })
      );
    }
  }, []);

  const sendReadReceipt = useCallback((messageId: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'read',
          message_id: messageId,
        })
      );
    }
  }, []);

  return (
    <SocketContext.Provider
      value={{
        sendTypingStart,
        sendTypingStop,
        sendReadReceipt,
        isConnected,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}
