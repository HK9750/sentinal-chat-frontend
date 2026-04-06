"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSocketConnection } from "@/hooks/use-socket-connection";
import {
  getMostAdvancedReceiptStatus,
  toConversationSummary,
  updateConversationPreview,
  upsertMessage,
} from "@/lib/chat-helpers";
import { SOCKET_EVENT } from "@/lib/constants";
import { setServerDeviceId } from "@/lib/device";
import { clearPendingMessageTimeout } from "@/lib/pending-message-timeouts";
import { parseMessageRequestId } from "@/lib/request-id";
import { queryKeys } from "@/queries/query-keys";
import {
  normalizeMessage,
  upsertReceiptState,
} from "@/services/message-service";
import { useAuthStore } from "@/stores/auth-store";
import { useCallStore } from "@/stores/call-store";
import { useChatStore } from "@/stores/chat-store";
import type {
  ConnectionReadyPayload,
  Contact,
  ConversationListPayload,
  IncomingCall,
  Message,
  MessageReaction,
  Poll,
  SocketEnvelope,
} from "@/types";

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
  const readyLoggedRef = useRef(false);
  const endedCallIdsRef = useRef<Map<string, number>>(new Map());

  const syncConversationPreviewFromMessages = useCallback(
    (conversationId: string, messages: Message[]) => {
      if (messages.length === 0) {
        return;
      }

      let latest = messages[0];
      for (let index = 1; index < messages.length; index += 1) {
        if (messages[index].seq_id > latest.seq_id) {
          latest = messages[index];
        }
      }

      let latestOwn: Message | undefined;
      if (currentUserId) {
        for (let index = messages.length - 1; index >= 0; index -= 1) {
          if (messages[index].sender_id === currentUserId) {
            latestOwn = messages[index];
            break;
          }
        }
      }

      queryClient.setQueryData<ConversationListPayload>(
        queryKeys.conversations,
        (convs) => {
          if (!convs) {
            return convs;
          }

          return {
            ...convs,
            items: convs.items.map((conv) => {
              if (conv.id !== conversationId) {
                return conv;
              }

              const nextConv =
                updateConversationPreview(
                  { ...convs, items: [conv] },
                  conversationId,
                  latest
                )?.items[0] ?? conv;

              if (
                !latestOwn ||
                latestOwn.client_status === "FAILED" ||
                !nextConv.last_message ||
                nextConv.last_message.sender_id !== currentUserId
              ) {
                return nextConv;
              }

              return {
                ...nextConv,
                last_message:
                  nextConv.last_message.id === latestOwn.id
                    ? toConversationSummary(latestOwn)
                    : {
                        ...nextConv.last_message,
                        receipt_status: getMostAdvancedReceiptStatus(latestOwn),
                      },
              };
            }),
          };
        }
      );
    },
    [currentUserId, queryClient]
  );

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      console.debug("[socket] bridge mounted");
    }

    return socket.subscribe((envelope: SocketEnvelope) => {
      if (process.env.NODE_ENV !== "production") {
        console.debug("[socket] event", envelope.type, envelope);
      }

      switch (envelope.type) {
        // ── Connection ──
        case SOCKET_EVENT.connectionReady: {
          const payload = envelope.data as ConnectionReadyPayload | undefined;
          if (payload?.device_id) {
            setServerDeviceId(payload.device_id);
          }
          if (
            process.env.NODE_ENV !== "production" &&
            !readyLoggedRef.current
          ) {
            readyLoggedRef.current = true;
            console.debug("[socket] connection ready received");
          }
          break;
        }

        // ── Typing ──
        case SOCKET_EVENT.typingStarted:
        case SOCKET_EVENT.typingStopped: {
          const conversationId = envelope.conversation_id;
          const userId = (envelope.data as { user_id?: string } | undefined)
            ?.user_id;
          if (conversationId && userId) {
            markTyping(
              conversationId,
              userId,
              envelope.type === SOCKET_EVENT.typingStarted,
            );
          }
          break;
        }

        // ── Presence ──
        case SOCKET_EVENT.presenceUpdate: {
          const payload = envelope.data as
            | { user_id?: string; is_online?: boolean; last_seen_at?: string }
            | undefined;
          const targetUserId = payload?.user_id;
          const isOnline = payload?.is_online;
          if (!targetUserId || typeof isOnline !== "boolean") break;

          queryClient.setQueryData<ConversationListPayload>(
            queryKeys.conversations,
            (current) => {
              if (!current) return current;
              return {
                ...current,
                items: current.items.map((conv) => ({
                  ...conv,
                  participants: conv.participants.map((p) =>
                    p.user_id === targetUserId
                      ? { ...p, is_online: isOnline }
                      : p,
                  ),
                })),
              };
            },
          );

          queryClient.setQueryData<Contact[]>(queryKeys.contacts, (current) => {
            if (!current) return current;
            return current.map((c) =>
              c.id === targetUserId
                ? {
                    ...c,
                    is_online: isOnline,
                    ...(payload.last_seen_at
                      ? { last_seen_at: payload.last_seen_at }
                      : {}),
                  }
                : c,
            );
          });
          break;
        }

        // ── Messages (new / edited / deleted) ──
        case SOCKET_EVENT.messageNew:
        case SOCKET_EVENT.messageEdited:
        case SOCKET_EVENT.messageDeleted: {
          const deletePayload = envelope.data as
            | { mode?: 'FOR_ME'; user_id?: string; message_ids?: string[] }
            | undefined;

          if (
            envelope.type === SOCKET_EVENT.messageDeleted &&
            deletePayload?.mode === 'FOR_ME'
          ) {
            if (!envelope.conversation_id) break;
            if (deletePayload.user_id !== currentUserId) break;
            const deleteIds = new Set(deletePayload.message_ids ?? []);
            if (deleteIds.size === 0) break;

            queryClient.setQueryData<Message[]>(
              queryKeys.messages(envelope.conversation_id),
              (current) => {
                const next = (current ?? []).filter((message) => !deleteIds.has(message.id));
                syncConversationPreviewFromMessages(envelope.conversation_id as string, next);
                return next;
              }
            );
            break;
          }

          const message = (envelope.data as { message?: Message } | undefined)
            ?.message;
          if (!message?.conversation_id) break;

          const normalized = normalizeMessage(message as never);
          if (normalized.client_message_id) {
            clearPendingMessageTimeout(normalized.conversation_id, normalized.client_message_id);
          }
          const currentMessage = queryClient
            .getQueryData<
              Message[]
            >(queryKeys.messages(normalized.conversation_id))
            ?.find(
              (item) =>
                item.id === normalized.id ||
                (normalized.client_message_id &&
                  item.client_message_id === normalized.client_message_id),
            );
          const withClientState: Message =
            currentMessage?.client_status === "FAILED"
              ? { ...normalized, client_status: "FAILED" }
              : normalized;

          queryClient.setQueryData<Message[]>(
            queryKeys.messages(normalized.conversation_id),
            (current) => {
              const nextMessages = upsertMessage(current, withClientState);
              syncConversationPreviewFromMessages(
                normalized.conversation_id,
                nextMessages
              );
              return nextMessages;
            }
          );
          break;
        }

        // ── Reactions (instant cache patch) ──
        case SOCKET_EVENT.messageReaction: {
          const conversationId = envelope.conversation_id;
          const data = envelope.data as
            | { message_id?: string; reactions?: MessageReaction[] }
            | undefined;
          if (!conversationId || !data?.message_id) break;

          queryClient.setQueryData<Message[]>(
            queryKeys.messages(conversationId),
            (current) =>
              (current ?? []).map((msg) =>
                msg.id === data.message_id
                  ? { ...msg, reactions: data.reactions ?? [] }
                  : msg,
              ),
          );
          break;
        }

        // ── Pin / Unpin (instant cache patch) ──
        case SOCKET_EVENT.messagePinned:
        case SOCKET_EVENT.messageUnpinned: {
          const conversationId = envelope.conversation_id;
          const data = envelope.data as
            | { message_id?: string; pinned?: boolean }
            | undefined;
          if (!conversationId || !data?.message_id) break;

          queryClient.setQueryData<Message[]>(
            queryKeys.messages(conversationId),
            (current) =>
              (current ?? []).map((msg) =>
                msg.id === data.message_id
                  ? { ...msg, pinned: data.pinned ?? false }
                  : msg,
              ),
          );
          break;
        }

        // ── Poll update (instant cache patch) ──
        case SOCKET_EVENT.pollUpdate: {
          const conversationId = envelope.conversation_id;
          const poll = (envelope.data as { poll?: Poll } | undefined)?.poll;
          if (!conversationId || !poll?.id) break;

          queryClient.setQueryData<Message[]>(
            queryKeys.messages(conversationId),
            (current) =>
              (current ?? []).map((msg) =>
                msg.poll?.id === poll.id ? { ...msg, poll } : msg,
              ),
          );
          break;
        }

        // ── Receipts ──
        case SOCKET_EVENT.receiptUpdate: {
          const conversationId = envelope.conversation_id;
          const payload = envelope.data as
            | {
                message_ids?: string[];
                user_id?: string;
                status?: string;
                up_to_seq_id?: number;
              }
            | undefined;
          if (!conversationId || !payload?.user_id || !payload.status) break;

          queryClient.setQueryData<Message[]>(
            queryKeys.messages(conversationId),
            (current) => {
              const next = upsertReceiptState(
                current,
                payload.user_id ?? "",
                payload.status ?? "DELIVERED",
                payload.message_ids ?? [],
                payload.up_to_seq_id,
              );

              syncConversationPreviewFromMessages(conversationId, next);

              return next;
            },
          );
          break;
        }

        // ── Send error → mark message as FAILED ──
        case SOCKET_EVENT.error: {
          const request = parseMessageRequestId(envelope.request_id);
          if (!request || request.action !== "send") break;
          if (
            envelope.conversation_id &&
            request.conversationId !== envelope.conversation_id
          )
            break;

          queryClient.setQueryData<Message[]>(
            queryKeys.messages(request.conversationId),
            (current) => {
              clearPendingMessageTimeout(request.conversationId, request.clientMessageId);
              const next = (current ?? []).map((msg) =>
                msg.client_message_id === request.clientMessageId
                  ? { ...msg, client_status: "FAILED" as const }
                  : msg,
              );
              syncConversationPreviewFromMessages(request.conversationId, next);
              return next;
            }
          );
          queryClient.invalidateQueries({ queryKey: queryKeys.conversations });
          break;
        }

        // ── Conversation lifecycle ──
        case "conversation:created":
        case "conversation:updated":
        case "conversation:participant_added":
        case "conversation:participant_removed":
        case "conversation:cleared": {
          queryClient.invalidateQueries({ queryKey: queryKeys.conversations });
          const targetId =
            envelope.conversation_id ??
            (envelope.data as { conversation_id?: string } | undefined)
              ?.conversation_id;
          if (targetId) {
            queryClient.invalidateQueries({
              queryKey: queryKeys.conversation(targetId),
            });
            if (envelope.type === "conversation:cleared") {
              queryClient.removeQueries({
                queryKey: queryKeys.messages(targetId),
              });
            }
          }
          break;
        }

        // ── Command undo/redo (simplified — just invalidate) ──
        case SOCKET_EVENT.commandUndone:
        case SOCKET_EVENT.commandRedone: {
          const cmdConvId = (
            envelope.data as
              | { command?: { conversation_id?: string } }
              | undefined
          )?.command?.conversation_id;
          queryClient.invalidateQueries({ queryKey: queryKeys.conversations });
          if (cmdConvId) {
            queryClient.invalidateQueries({
              queryKey: queryKeys.conversation(cmdConvId),
            });
            queryClient.invalidateQueries({
              queryKey: queryKeys.messages(cmdConvId),
            });
          }
          break;
        }

        // ── Call signaling ──
        case SOCKET_EVENT.callIncoming: {
          const payload = envelope.data as IncomingCall | undefined;
          if (!payload?.call_id || !envelope.conversation_id) break;

          if (process.env.NODE_ENV !== "production") {
            console.debug("[CALL_END] recv call:incoming", {
              call_id: payload.call_id,
              initiated_by: payload.initiated_by,
              conversation_id: envelope.conversation_id,
              request_id: envelope.request_id,
            });
          }

          const now = Date.now();
          for (const [callId, endedAt] of endedCallIdsRef.current) {
            if (now - endedAt > 60_000) {
              endedCallIdsRef.current.delete(callId);
            }
          }

          if (endedCallIdsRef.current.has(payload.call_id)) {
            if (process.env.NODE_ENV !== "production") {
              console.debug("[CALL_END] ignore stale call:incoming for ended call", {
                call_id: payload.call_id,
              });
            }
            break;
          }

          const { activeCall, incomingCall } = useCallStore.getState();
          if (
            activeCall?.call_id === payload.call_id ||
            incomingCall?.call_id === payload.call_id
          ) {
            if (process.env.NODE_ENV !== "production") {
              console.debug("[CALL_END] ignore duplicate call:incoming", {
                call_id: payload.call_id,
              });
            }
            break;
          }

          const peerUserId = payload.participant_ids?.find(
            (id) => id !== currentUserId,
          );

          if (payload.initiated_by === currentUserId) {
            if (!envelope.request_id) {
              if (process.env.NODE_ENV !== "production") {
                console.debug("[CALL_END] ignore broadcast echo call:incoming for self", {
                  call_id: payload.call_id,
                });
              }
              break;
            }
            setActiveCall({
              call_id: payload.call_id,
              conversation_id: envelope.conversation_id,
              type: payload.type,
              peer_user_id: peerUserId,
              initiator_id: payload.initiated_by,
              started_at: payload.started_at,
              status: "outgoing",
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
          if (!envelope.call_id) break;
          enqueueSignal({
            id: `${envelope.type}:${envelope.call_id}:${envelope.sent_at}`,
            type: envelope.type as "call:offer" | "call:answer" | "call:ice",
            call_id: envelope.call_id,
            conversation_id: envelope.conversation_id,
            signal: envelope.data as {
              from_user_id: string;
              payload: Record<string, unknown>;
            },
          });
          break;
        }
        case SOCKET_EVENT.callEnded: {
          const reason = (envelope.data as { reason?: string } | undefined)
            ?.reason;
          const endedCallId = envelope.call_id;

          if (process.env.NODE_ENV !== "production") {
            console.debug("[CALL_END] recv call:ended", {
              call_id: endedCallId,
              reason,
              actor_id: (envelope.data as { actor_id?: string } | undefined)
                ?.actor_id,
              conversation_id: envelope.conversation_id,
            });
          }

          if (endedCallId) {
            endedCallIdsRef.current.set(endedCallId, Date.now());
          }
          const { activeCall, incomingCall } = useCallStore.getState();

          const matchesActiveCall =
            !!activeCall &&
            (!endedCallId || activeCall.call_id === endedCallId);
          const matchesIncomingCall =
            !!incomingCall &&
            (!endedCallId || incomingCall.call_id === endedCallId);

          if (matchesIncomingCall && !matchesActiveCall) {
            if (process.env.NODE_ENV !== "production") {
              console.debug("[CALL_END] closing incoming dialog", {
                call_id: endedCallId,
              });
            }
            resetCall();
            break;
          }

          if (!matchesActiveCall) {
            if (process.env.NODE_ENV !== "production") {
              console.debug("[CALL_END] ignoring unrelated call:ended", {
                call_id: endedCallId,
              });
            }
            break;
          }

          setCallStatus("ended", reason);
          if (process.env.NODE_ENV !== "production") {
            console.debug("[CALL_END] closing active call overlay", {
              call_id: endedCallId,
            });
          }
          resetCall();
          break;
        }

        default:
          break;
      }
    });
  }, [
    currentUserId,
    enqueueSignal,
    markTyping,
    queryClient,
    resetCall,
    setActiveCall,
    setCallStatus,
    setIncomingCall,
    socket,
    syncConversationPreviewFromMessages,
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
    throw new Error("useSocket must be used within SocketProvider.");
  }

  return context;
}
