'use client';

import { createContext, useContext, useEffect, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSocketConnection } from '@/hooks/use-socket-connection';
import { SOCKET_EVENT } from '@/lib/constants';
import { setServerDeviceId } from '@/lib/device';
import { queryKeys } from '@/queries/query-keys';
import { normalizeMessage } from '@/services/message-service';
import { consumeConversationKeyShare } from '@/services/key-exchange-service';
import { useAuthStore } from '@/stores/auth-store';
import { useCallStore } from '@/stores/call-store';
import { useChatStore } from '@/stores/chat-store';
import type { ConnectionReadyPayload, ConversationKeyShare, IncomingCall, Message, SocketEnvelope } from '@/types';

type SocketContextValue = ReturnType<typeof useSocketConnection>;

const SocketContext = createContext<SocketContextValue | null>(null);

function SocketEventBridge({ socket }: { socket: SocketContextValue }) {
  const queryClient = useQueryClient();
  const currentUserId = useAuthStore((state) => state.user?.id);
  const markTyping = useChatStore((state) => state.markTyping);
  const setIncomingCall = useCallStore((state) => state.setIncomingCall);
  const setActiveCall = useCallStore((state) => state.setActiveCall);
  const enqueueSignal = useCallStore((state) => state.enqueueSignal);
  const setCallStatus = useCallStore((state) => state.setCallStatus);
  const resetCall = useCallStore((state) => state.resetCall);

  useEffect(() => {
    return socket.subscribe((envelope: SocketEnvelope) => {
      switch (envelope.type) {
        case SOCKET_EVENT.connectionReady: {
          const payload = envelope.data as ConnectionReadyPayload | undefined;

          if (payload?.device_id) {
            setServerDeviceId(payload.device_id);
          }
          break;
        }
        case SOCKET_EVENT.conversationKeyShare: {
          const share = (envelope.data as { share?: ConversationKeyShare } | undefined)?.share;

          if (!share) {
            break;
          }

          void consumeConversationKeyShare(share)
            .then(() => {
              queryClient.invalidateQueries({ queryKey: queryKeys.messages(share.conversation_id) });
            })
            .catch(() => undefined);
          break;
        }
        case SOCKET_EVENT.typingStarted:
        case SOCKET_EVENT.typingStopped: {
          const conversationId = envelope.conversation_id;
          const userId = (envelope.data as { user_id?: string } | undefined)?.user_id;

          if (conversationId && userId) {
            markTyping(conversationId, userId, envelope.type === SOCKET_EVENT.typingStarted);
          }
          break;
        }
        case SOCKET_EVENT.messageNew:
        case SOCKET_EVENT.messageEdited:
        case SOCKET_EVENT.messageDeleted: {
          const message = (envelope.data as { message?: Message } | undefined)?.message;

          if (!message?.conversation_id) {
            break;
          }

          const normalized = normalizeMessage(message as never);
          queryClient.setQueryData<Message[]>(queryKeys.messages(normalized.conversation_id), (current) => {
            const existing = current ?? [];
            const next = existing.filter(
              (item) => item.id !== normalized.id && item.client_message_id !== normalized.client_message_id
            );
            next.push(normalized);
            return next.sort((left, right) => left.seq_id - right.seq_id);
          });
          queryClient.invalidateQueries({ queryKey: queryKeys.conversations });
          break;
        }
        case SOCKET_EVENT.messageReaction:
        case SOCKET_EVENT.messagePinned:
        case SOCKET_EVENT.messageUnpinned:
        case SOCKET_EVENT.receiptUpdate:
        case SOCKET_EVENT.pollUpdate: {
          if (envelope.conversation_id) {
            queryClient.invalidateQueries({ queryKey: queryKeys.messages(envelope.conversation_id) });
            queryClient.invalidateQueries({ queryKey: queryKeys.conversations });
          }
          break;
        }
        case 'conversation:created':
        case 'conversation:participant_added':
        case 'conversation:participant_removed':
        case 'conversation:cleared': {
          queryClient.invalidateQueries({ queryKey: queryKeys.conversations });
          if (envelope.conversation_id) {
            queryClient.invalidateQueries({ queryKey: queryKeys.conversation(envelope.conversation_id) });
          }
          break;
        }
        case SOCKET_EVENT.callIncoming: {
          const payload = envelope.data as IncomingCall | undefined;

          if (!payload?.call_id || !envelope.conversation_id) {
            break;
          }

          if (payload.initiated_by === currentUserId) {
            setActiveCall({
              call_id: payload.call_id,
              conversation_id: envelope.conversation_id,
              type: payload.type,
              initiator_id: payload.initiated_by,
              started_at: payload.started_at,
              status: 'outgoing',
            });
          } else {
            setIncomingCall({
              call_id: payload.call_id,
              conversation_id: envelope.conversation_id,
              initiated_by: payload.initiated_by,
              type: payload.type,
              started_at: payload.started_at,
            });
          }
          break;
        }
        case SOCKET_EVENT.callOffer:
        case SOCKET_EVENT.callAnswer:
        case SOCKET_EVENT.callIce: {
          if (!envelope.call_id) {
            break;
          }

          enqueueSignal({
            id: `${envelope.type}:${envelope.call_id}:${envelope.sent_at}`,
            type: envelope.type as 'call:offer' | 'call:answer' | 'call:ice',
            call_id: envelope.call_id,
            conversation_id: envelope.conversation_id,
            signal: envelope.data as { from_user_id: string; payload: Record<string, unknown> },
          });
          break;
        }
        case SOCKET_EVENT.callEnded: {
          const reason = (envelope.data as { reason?: string } | undefined)?.reason;
          setCallStatus('ended', reason);
          window.setTimeout(() => {
            resetCall();
          }, 500);
          break;
        }
        default:
          break;
      }
    });
  }, [currentUserId, enqueueSignal, markTyping, queryClient, resetCall, setActiveCall, setCallStatus, setIncomingCall, socket]);

  return null;
}

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const socket = useSocketConnection();
  const value = useMemo(() => socket, [socket]);

  return (
    <SocketContext.Provider value={value}>
      <SocketEventBridge socket={socket} />
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);

  if (!context) {
    throw new Error('useSocket must be used within SocketProvider.');
  }

  return context;
}
