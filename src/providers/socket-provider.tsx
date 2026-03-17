'use client';

import { createContext, useContext, useEffect, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSocketConnection } from '@/hooks/use-socket-connection';
import { SOCKET_EVENT } from '@/lib/constants';
import { setServerDeviceId } from '@/lib/device';
import { parseMessageRequestId } from '@/lib/request-id';
import { queryKeys } from '@/queries/query-keys';
import { mergeMessage, normalizeMessage, upsertReceiptState } from '@/services/message-service';
import { useAuthStore } from '@/stores/auth-store';
import { useCallStore } from '@/stores/call-store';
import { useChatStore } from '@/stores/chat-store';
import type { ConnectionReadyPayload, ConversationListPayload, ConversationMessageSummary, IncomingCall, Message, SocketEnvelope } from '@/types';

type SocketContextValue = ReturnType<typeof useSocketConnection>;

const SocketContext = createContext<SocketContextValue | null>(null);

function toConversationSummary(message: Message): ConversationMessageSummary {
  const receiptStatus = (message.receipts ?? [])
    .filter((receipt) => receipt.user_id !== message.sender_id)
    .reduce<ConversationMessageSummary['receipt_status']>((state, receipt) => {
      if (receipt.status === 'PLAYED') {
        return 'PLAYED';
      }
      if (receipt.status === 'READ' && state !== 'PLAYED') {
        return 'READ';
      }
      if (receipt.status === 'DELIVERED' && state === 'SENT') {
        return 'DELIVERED';
      }
      return state;
    }, 'SENT');

  return {
    id: message.id,
    sender_id: message.sender_id,
    kind: message.type,
    created_at: message.created_at,
    seq_id: message.seq_id,
    receipt_status: receiptStatus,
    deleted_at: message.deleted_at,
  };
}

function upsertMessage(current: Message[] | undefined, incoming: Message): Message[] {
  const existing = (current ?? []).find(
    (item) => item.id === incoming.id || item.client_message_id === incoming.client_message_id
  );
  const merged = mergeMessage(existing, incoming);
  const next = (current ?? []).filter(
    (item) => item.id !== incoming.id && item.client_message_id !== incoming.client_message_id
  );
  next.push(merged);
  return next.sort((left, right) => left.seq_id - right.seq_id);
}

function updateConversationPreview(
  payload: ConversationListPayload | undefined,
  conversationId: string,
  message: Message
): ConversationListPayload | undefined {
  if (!payload) {
    return payload;
  }

  const items = payload.items.map((conversation) => {
    if (conversation.id !== conversationId) {
      return conversation;
    }

    return {
      ...conversation,
      updated_at: message.created_at,
      last_message_at: message.created_at,
      last_message: toConversationSummary(message),
    };
  });

  items.sort((left, right) => {
    const leftTime = left.last_message_at ?? left.updated_at;
    const rightTime = right.last_message_at ?? right.updated_at;
    return new Date(rightTime).getTime() - new Date(leftTime).getTime();
  });

  return {
    ...payload,
    items,
  };
}

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
          queryClient.setQueryData<Message[]>(queryKeys.messages(normalized.conversation_id), (current) =>
            upsertMessage(current, normalized)
          );
          queryClient.setQueryData<ConversationListPayload>(queryKeys.conversations, (payload) =>
            updateConversationPreview(payload, normalized.conversation_id, normalized)
          );
          break;
        }
        case SOCKET_EVENT.messageReaction:
        case SOCKET_EVENT.messagePinned:
        case SOCKET_EVENT.messageUnpinned:
        case SOCKET_EVENT.pollUpdate: {
          if (envelope.conversation_id) {
            queryClient.invalidateQueries({ queryKey: queryKeys.messages(envelope.conversation_id) });
            queryClient.invalidateQueries({ queryKey: queryKeys.conversations });
          }
          break;
        }
        case SOCKET_EVENT.receiptUpdate: {
          const conversationId = envelope.conversation_id;
          const payload = envelope.data as
            | { message_ids?: string[]; user_id?: string; status?: string; up_to_seq_id?: number }
            | undefined;

          if (!conversationId || !payload?.user_id || !payload.status) {
            break;
          }

          queryClient.setQueryData<Message[]>(queryKeys.messages(conversationId), (current) => {
            const next = upsertReceiptState(current, payload.user_id ?? '', payload.status ?? 'DELIVERED', payload.message_ids ?? []);
            const latest = [...next].sort((left, right) => right.seq_id - left.seq_id)[0];

            if (latest) {
              queryClient.setQueryData<ConversationListPayload>(queryKeys.conversations, (conversations) =>
                updateConversationPreview(conversations, conversationId, latest)
              );
            }

            return next;
          });
          break;
        }
        case SOCKET_EVENT.error: {
          const request = parseMessageRequestId(envelope.request_id);

          if (!request || request.action !== 'send') {
            break;
          }

          queryClient.setQueryData<Message[]>(queryKeys.messages(request.conversationId), (current) =>
            (current ?? []).filter((message) => message.client_message_id !== request.clientMessageId)
          );
          queryClient.invalidateQueries({ queryKey: queryKeys.conversations });
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

          const peerUserId = payload.participant_ids?.find((participantId) => participantId !== currentUserId);

          if (payload.initiated_by === currentUserId) {
            setActiveCall({
              call_id: payload.call_id,
              conversation_id: envelope.conversation_id,
              type: payload.type,
              peer_user_id: peerUserId,
              initiator_id: payload.initiated_by,
              started_at: payload.started_at,
              status: 'outgoing',
              participant_ids: payload.participant_ids,
            });
          } else {
            setIncomingCall({
              call_id: payload.call_id,
              conversation_id: envelope.conversation_id,
              initiated_by: payload.initiated_by,
              type: payload.type,
              started_at: payload.started_at,
              participant_ids: payload.participant_ids,
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
          }, 1500);
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
