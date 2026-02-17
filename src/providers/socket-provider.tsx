'use client';

import { createContext, useContext, useEffect, useRef, useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { env } from '@/config/env';
import { useAuthStore } from '@/stores/auth-store';
import { useChatStore } from '@/stores/chat-store';
import { useCallStore } from '@/stores/call-store';
import { WebSocketEvent, WebSocketTypingEvent } from '@/types';
import type { Call, CallType } from '@/types/call';

// WebRTC signaling types
interface CallOfferPayload {
  call_id: string;
  conversation_id: string;
  caller_id: string;
  caller_name: string;
  call_type: CallType;
  sdp: string;
}

interface CallAnswerPayload {
  call_id: string;
  participant_id: string;
  sdp: string;
}

interface CallIcePayload {
  call_id: string;
  participant_id: string;
  candidate: RTCIceCandidateInit;
}

interface CallEndedPayload {
  call_id: string;
  reason: string;
}

interface SocketContextType {
  // Typing indicators
  sendTypingStart: (conversationId: string) => void;
  sendTypingStop: (conversationId: string) => void;
  sendReadReceipt: (messageId: string) => void;
  
  // Call signaling
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
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const tokens = useAuthStore((state) => state.tokens);
  
  // Only typing users live in Zustand (real-time state)
  const addTypingUser = useChatStore((state) => state.addTypingUser);
  const removeTypingUser = useChatStore((state) => state.removeTypingUser);
  
  // Call state from Zustand
  const setIncomingCall = useCallStore((state) => state.setIncomingCall);
  const setActiveCall = useCallStore((state) => state.setActiveCall);
  const endCall = useCallStore((state) => state.endCall);
  const setPeerConnection = useCallStore((state) => state.setPeerConnection);
  const setRemoteStream = useCallStore((state) => state.setRemoteStream);
  const peerConnections = useCallStore((state) => state.peerConnections);

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

          case 'call:offer': {
            const payload = data.payload as CallOfferPayload;
            // Create a mock Call object from the offer
            const incomingCall: Call = {
              id: payload.call_id,
              conversation_id: payload.conversation_id,
              type: payload.call_type,
              status: 'RINGING',
              initiator_id: payload.caller_id,
              created_at: new Date().toISOString(),
            };
            setIncomingCall(incomingCall, payload.caller_id, payload.caller_name);
            
            // Store the SDP for when user accepts
            sessionStorage.setItem(`call:${payload.call_id}:offer`, payload.sdp);
            break;
          }

          case 'call:answer': {
            const payload = data.payload as CallAnswerPayload;
            const pc = peerConnections.get(payload.participant_id);
            if (pc) {
              pc.setRemoteDescription(new RTCSessionDescription({
                type: 'answer',
                sdp: payload.sdp,
              }));
            }
            break;
          }

          case 'call:ice': {
            const payload = data.payload as CallIcePayload;
            const pc = peerConnections.get(payload.participant_id);
            if (pc && payload.candidate) {
              pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
            }
            break;
          }

          case 'call:ended': {
            const payload = data.payload as CallEndedPayload;
            endCall();
            // Clean up stored offer if any
            sessionStorage.removeItem(`call:${payload.call_id}:offer`);
            // Invalidate call history
            queryClient.invalidateQueries({ queryKey: ['calls'] });
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
  }, [tokens?.access_token, queryClient, addTypingUser, removeTypingUser, setIncomingCall, endCall, peerConnections]);

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
          type: 'typing:started',
          conversation_id: conversationId,
        })
      );
    }
  }, []);

  const sendTypingStop = useCallback((conversationId: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'typing:stopped',
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

  // Call signaling methods
  const sendCallOffer = useCallback((callId: string, participantId: string, sdp: RTCSessionDescriptionInit) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'call:offer',
          call_id: callId,
          participant_id: participantId,
          sdp: sdp.sdp,
        })
      );
    }
  }, []);

  const sendCallAnswer = useCallback((callId: string, participantId: string, sdp: RTCSessionDescriptionInit) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'call:answer',
          call_id: callId,
          participant_id: participantId,
          sdp: sdp.sdp,
        })
      );
    }
  }, []);

  const sendIceCandidate = useCallback((callId: string, participantId: string, candidate: RTCIceCandidate) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'call:ice',
          call_id: callId,
          participant_id: participantId,
          candidate: candidate.toJSON(),
        })
      );
    }
  }, []);

  const sendCallEnd = useCallback((callId: string, reason?: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'call:end',
          call_id: callId,
          reason: reason || 'COMPLETED',
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
