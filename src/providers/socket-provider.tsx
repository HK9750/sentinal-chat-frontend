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
import type {
  ConnectionReadyPayload,
  Contact,
  ConversationListPayload,
  ConversationMessageSummary,
  IncomingCall,
  Message,
  SocketEnvelope,
} from '@/types';

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
  const mergedWithClientStatus =
    merged.sender_id === incoming.sender_id && merged.client_message_id
      ? { ...merged, client_status: 'SENT' as const }
      : merged;
  const next = (current ?? []).filter(
    (item) => item.id !== incoming.id && item.client_message_id !== incoming.client_message_id
  );
  next.push(mergedWithClientStatus);
  return next.sort((left, right) => left.seq_id - right.seq_id);
}

function removeCommandPreview(
  payload: ConversationListPayload | undefined,
  conversationId: string,
  messageType: string,
  messageId?: string
): ConversationListPayload | undefined {
  if (!payload) {
    return payload;
  }

  const normalizedType = messageType.toUpperCase();
  const items = payload.items.map((conversation) => {
    if (conversation.id !== conversationId) {
      return conversation;
    }

    if (!conversation.last_message || conversation.last_message.kind.toUpperCase() !== normalizedType) {
      return conversation;
    }

    if (messageId && conversation.last_message.id !== messageId) {
      return conversation;
    }

    return {
      ...conversation,
      last_message: null,
    };
  });

  return {
    ...payload,
    items,
  };
}

function parseCommandMessageId(envelope: SocketEnvelope): string | undefined {
  const data = envelope.data as { command?: { payload?: { message_id?: string }; undo_payload?: { message_id?: string } } } | undefined;
  return data?.command?.payload?.message_id ?? data?.command?.undo_payload?.message_id;
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

function getMostAdvancedReceiptStatus(message: Message): ConversationMessageSummary['receipt_status'] {
  const others = (message.receipts ?? []).filter((receipt) => receipt.user_id !== message.sender_id);

  return others.reduce<ConversationMessageSummary['receipt_status']>((state, receipt) => {
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
}

function updateConversationLastMessageReceipt(
  payload: ConversationListPayload | undefined,
  conversationId: string,
  currentUserId: string,
  status: ConversationMessageSummary['receipt_status']
): ConversationListPayload | undefined {
  if (!payload) {
    return payload;
  }

  return {
    ...payload,
    items: payload.items.map((conversation) => {
      if (conversation.id !== conversationId || !conversation.last_message) {
        return conversation;
      }

      if (conversation.last_message.sender_id !== currentUserId) {
        return conversation;
      }

      return {
        ...conversation,
        last_message: {
          ...conversation.last_message,
          receipt_status: status,
        },
      };
    }),
  };
}

function SocketEventBridge({ socket }: { socket: SocketContextValue }) {
  const queryClient = useQueryClient();
  const currentUserId = useAuthStore((state) => state.user?.id);
  const markTyping = useChatStore((state) => state.markTyping);
  const setLastUndoneCommand = useChatStore((state) => state.setLastUndoneCommand);
  const clearLastUndoneCommand = useChatStore((state) => state.clearLastUndoneCommand);
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
        case SOCKET_EVENT.presenceUpdate: {
          const payload = envelope.data as { user_id?: string; is_online?: boolean; last_seen_at?: string } | undefined;
          const targetUserId = payload?.user_id;
          const isOnline = payload?.is_online;

          if (!targetUserId || typeof isOnline !== 'boolean') {
            break;
          }

          queryClient.setQueryData<ConversationListPayload>(queryKeys.conversations, (current) => {
            if (!current) {
              return current;
            }

            return {
              ...current,
              items: current.items.map((conversation) => ({
                ...conversation,
                participants: conversation.participants.map((participant) => {
                  if (participant.user_id !== targetUserId) {
                    return participant;
                  }

                  return {
                    ...participant,
                    is_online: isOnline,
                  };
                }),
              })),
            };
          });

          queryClient.setQueryData<Contact[]>(queryKeys.contacts, (current) => {
            if (!current) {
              return current;
            }

            return current.map((contact) =>
              contact.id === targetUserId
                ? {
                    ...contact,
                    is_online: isOnline,
                    ...(payload.last_seen_at ? { last_seen_at: payload.last_seen_at } : {}),
                  }
                : contact
            );
          });

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
          const normalizedWithClientState: Message = {
            ...normalized,
            client_status:
              normalized.sender_id === currentUserId && normalized.client_message_id
                ? 'SENT'
                : normalized.client_status,
          };
          queryClient.setQueryData<Message[]>(queryKeys.messages(normalized.conversation_id), (current) =>
            upsertMessage(current, normalizedWithClientState)
          );
          queryClient.setQueryData<ConversationListPayload>(queryKeys.conversations, (payload) =>
            updateConversationPreview(payload, normalized.conversation_id, normalizedWithClientState)
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
            const next = upsertReceiptState(
              current,
              payload.user_id ?? '',
              payload.status ?? 'DELIVERED',
              payload.message_ids ?? [],
              payload.up_to_seq_id
            );
            const latest = [...next].sort((left, right) => right.seq_id - left.seq_id)[0];
            const latestOwn = [...next]
              .filter((message) => message.sender_id === currentUserId)
              .sort((left, right) => right.seq_id - left.seq_id)[0];

            if (latest) {
              queryClient.setQueryData<ConversationListPayload>(queryKeys.conversations, (conversations) =>
                updateConversationPreview(conversations, conversationId, latest)
              );
            }

            if (latestOwn && currentUserId) {
              queryClient.setQueryData<ConversationListPayload>(queryKeys.conversations, (conversations) =>
                updateConversationLastMessageReceipt(
                  conversations,
                  conversationId,
                  currentUserId,
                  getMostAdvancedReceiptStatus(latestOwn)
                )
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

          if (envelope.conversation_id && request.conversationId !== envelope.conversation_id) {
            break;
          }

          queryClient.setQueryData<Message[]>(queryKeys.messages(request.conversationId), (current) =>
            (current ?? []).map((message) =>
              message.client_message_id === request.clientMessageId
                ? {
                    ...message,
                    client_status: 'FAILED' as const,
                  }
                : message
            )
          );
          queryClient.invalidateQueries({ queryKey: queryKeys.conversations });
          break;
        }
        case 'conversation:created':
        case 'conversation:participant_added':
        case 'conversation:participant_removed':
        case 'conversation:cleared': {
          queryClient.invalidateQueries({ queryKey: queryKeys.conversations });
          const payloadConversationId = (envelope.data as { conversation_id?: string } | undefined)?.conversation_id;
          const targetConversationId = envelope.conversation_id ?? payloadConversationId;
          if (targetConversationId) {
            queryClient.invalidateQueries({ queryKey: queryKeys.conversation(targetConversationId) });
            if (envelope.type === 'conversation:cleared') {
              queryClient.removeQueries({ queryKey: queryKeys.messages(targetConversationId) });
            }
          }
          break;
        }
        case SOCKET_EVENT.commandUndone:
        case SOCKET_EVENT.commandRedone: {
          const commandConversationId = (envelope.data as { command?: { conversation_id?: string } } | undefined)?.command?.conversation_id;
          const commandId = (envelope.data as { command?: { command_id?: string } } | undefined)?.command?.command_id;
          const commandStatus = (envelope.data as { command?: { status?: string } } | undefined)?.command?.status;
          const commandType = (envelope.data as { command?: { type?: string } } | undefined)?.command?.type;
          const commandMessageId = parseCommandMessageId(envelope);
          queryClient.invalidateQueries({ queryKey: queryKeys.conversations });
          if (commandConversationId) {
            queryClient.invalidateQueries({ queryKey: queryKeys.conversation(commandConversationId) });
            queryClient.invalidateQueries({ queryKey: queryKeys.messages(commandConversationId) });

            if (envelope.type === SOCKET_EVENT.commandUndone && commandType) {
              const normalizedType = commandType.toUpperCase();
              if (normalizedType === 'DELETE_MESSAGE') {
                queryClient.setQueryData<ConversationListPayload>(queryKeys.conversations, (conversations) =>
                  removeCommandPreview(conversations, commandConversationId, 'TEXT', commandMessageId)
                );
                queryClient.setQueryData<Message[]>(queryKeys.messages(commandConversationId), (current) => {
                  if (!current || !commandMessageId) {
                    return current;
                  }

                  return current.map((message) =>
                    message.id === commandMessageId
                      ? {
                          ...message,
                          deleted_at: null,
                        }
                      : message
                  );
                });
              }
            }

            if (envelope.type === SOCKET_EVENT.commandUndone && commandId) {
              setLastUndoneCommand(commandConversationId, commandId);
            }
            if (envelope.type === SOCKET_EVENT.commandRedone || commandStatus === 'EXECUTED') {
              clearLastUndoneCommand(commandConversationId);
            }
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
  }, [
    clearLastUndoneCommand,
    currentUserId,
    enqueueSignal,
    markTyping,
    queryClient,
    resetCall,
    setActiveCall,
    setCallStatus,
    setIncomingCall,
    setLastUndoneCommand,
    socket,
  ]);

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
