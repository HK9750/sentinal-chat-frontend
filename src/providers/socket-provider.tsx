'use client';

import { createContext, useContext, useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { env } from '@/config/env';
import { useAuthStore } from '@/stores/auth-store';
import { useChatStore } from '@/stores/chat-store';
import { WebSocketEvent, Message, WebSocketTypingEvent } from '@/types';

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
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const tokens = useAuthStore((state) => state.tokens);
  const addMessage = useChatStore((state) => state.addMessage);
  const addTypingUser = useChatStore((state) => state.addTypingUser);
  const removeTypingUser = useChatStore((state) => state.removeTypingUser);
  const updateMessage = useChatStore((state) => state.updateMessage);
  const isConnected = wsRef.current?.readyState === WebSocket.OPEN;

  const connect = useCallback(() => {
    if (!tokens?.access_token) return;

    const wsUrl = `${env.SOCKET_URL}/v1/ws?token=${tokens.access_token}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('WebSocket connected');
    };

    ws.onmessage = (event) => {
      try {
        const data: WebSocketEvent = JSON.parse(event.data);
        
        switch (data.type) {
          case 'message:new': {
            const payload = data.payload as { message_id: string; conversation_id: string; sender_id: string };
            // Refetch messages for the conversation
            queryClient.invalidateQueries({
              queryKey: ['conversations', payload.conversation_id, 'messages'],
            });
            queryClient.invalidateQueries({
              queryKey: ['conversations', 'list'],
            });
            break;
          }
          
          case 'message:read': {
            const payload = data.payload as { message_id: string; conversation_id: string; reader_id: string };
            updateMessage(payload.conversation_id, payload.message_id, {
              // Update read status
            });
            break;
          }
          
          case 'message:delivered': {
            const payload = data.payload as { message_id: string; conversation_id: string; recipient_id: string };
            // Handle delivered status
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
            // Handle presence updates
            break;
          }
          
          case 'call:offer':
          case 'call:answer':
          case 'call:ice':
          case 'call:ended': {
            // Handle call signaling
            break;
          }
          
          default:
            console.log('Unknown WebSocket event:', data.type);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      // Attempt to reconnect after 3 seconds
      setTimeout(() => {
        if (isAuthenticated) {
          connect();
        }
      }, 3000);
    };

    wsRef.current = ws;
  }, [tokens?.access_token, isAuthenticated, queryClient, addMessage, addTypingUser, removeTypingUser, updateMessage]);

  useEffect(() => {
    if (isAuthenticated && tokens?.access_token) {
      connect();
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [isAuthenticated, tokens?.access_token, connect]);

  const sendTypingStart = useCallback((conversationId: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'typing:start',
        conversation_id: conversationId,
      }));
    }
  }, []);

  const sendTypingStop = useCallback((conversationId: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'typing:stop',
        conversation_id: conversationId,
      }));
    }
  }, []);

  const sendReadReceipt = useCallback((messageId: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'read',
        message_id: messageId,
      }));
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
