'use client';

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { updateConversationPreview, upsertMessage } from '@/lib/chat-helpers';
import { MESSAGE_SEND_ACK_TIMEOUT_MS, SOCKET_EVENT } from '@/lib/constants';
import { schedulePendingMessageTimeout } from '@/lib/pending-message-timeouts';
import { createClientMessageId, createMessageRequestId, createRequestId } from '@/lib/request-id';
import {
  buildBulkDeleteMessagesFrame,
  buildDeleteMessageFrame,
  buildEditMessageFrame,
  buildReactionFrame,
  buildRedoFrame,
  buildSendMessageFrame,
  buildUndoFrame,
  createOptimisticMessage,
} from '@/services/message-service';
import { queryKeys } from '@/queries/query-keys';
import { useSocket } from '@/providers/socket-provider';
import { useAuthStore } from '@/stores/auth-store';
import type {
  ConversationListPayload,
  Message,
  MessageDeleteMode,
  MessageType,
} from '@/types';

export function useMessageChannel(conversationId?: string | null) {
  const socket = useSocket();
  const queryClient = useQueryClient();
  const currentUserId = useAuthStore((state) => state.user?.id);

  const sendMessage = useCallback(
    (content: string, type: MessageType, attachmentIds: string[] = [], replyToMessageId?: string) => {
      if (!conversationId) return null;

      const clientMessageId = createClientMessageId();

      if (currentUserId) {
        const optimistic = createOptimisticMessage({
          conversationId,
          senderId: currentUserId,
          clientMessageId,
          type,
          content,
          replyToMessageId,
        });

        queryClient.setQueryData<Message[]>(queryKeys.messages(conversationId), (msgs) =>
          upsertMessage(msgs, optimistic)
        );
        queryClient.setQueryData<ConversationListPayload>(queryKeys.conversations, (payload) =>
          updateConversationPreview(payload, conversationId, optimistic)
        );

        schedulePendingMessageTimeout({
          conversationId,
          clientMessageId,
          timeoutMs: MESSAGE_SEND_ACK_TIMEOUT_MS,
          onTimeout: () => {
            queryClient.setQueryData<Message[]>(queryKeys.messages(conversationId), (current) =>
              (current ?? []).map((message) =>
                message.client_message_id === clientMessageId && message.client_status === 'PENDING'
                  ? { ...message, client_status: 'FAILED' as const }
                  : message
              )
            );

            queryClient.setQueryData<ConversationListPayload>(queryKeys.conversations, (payload) => {
              if (!payload) {
                return payload;
              }

              const optimisticMessageId = `optimistic:${clientMessageId}`;

              return {
                ...payload,
                items: payload.items.map((conversation) =>
                  conversation.id === conversationId && conversation.last_message?.id === optimisticMessageId
                    ? {
                        ...conversation,
                        last_message: {
                          ...conversation.last_message,
                          client_status: 'FAILED',
                        },
                      }
                    : conversation
                ),
              };
            });
          },
        });
      }

      socket.send(
        buildSendMessageFrame(
          conversationId,
          {
            client_message_id: clientMessageId,
            type,
            content,
            attachment_ids: attachmentIds.length > 0 ? attachmentIds : undefined,
            reply_to_msg_id: replyToMessageId,
          },
          createMessageRequestId('send', conversationId, clientMessageId)
        )
      );

      return clientMessageId;
    },
    [conversationId, currentUserId, queryClient, socket]
  );

  const editMessage = useCallback(
    (messageId: string, content: string) => {
      if (!conversationId) return;
      socket.send(
        buildEditMessageFrame(conversationId, { message_id: messageId, content }, createRequestId('edit'))
      );
    },
    [conversationId, socket]
  );

  const deleteMessage = useCallback(
    (messageId: string) => {
      if (!conversationId) return;
      socket.send(buildDeleteMessageFrame(conversationId, messageId, createRequestId('delete')));
    },
    [conversationId, socket]
  );

  const deleteMessages = useCallback(
    (messageIds: string[], mode: MessageDeleteMode) => {
      if (!conversationId || messageIds.length === 0) return;
      socket.send(
        buildBulkDeleteMessagesFrame(
          conversationId,
          messageIds,
          mode,
          createRequestId('delete-bulk')
        )
      );
    },
    [conversationId, socket]
  );

  const reactToMessage = useCallback(
    (messageId: string, reactionCode: string, mode: 'add' | 'remove') => {
      if (!conversationId) return;
      socket.send(
        buildReactionFrame(
          conversationId,
          { message_id: messageId, reaction_code: reactionCode },
          mode,
          createRequestId('react')
        )
      );
    },
    [conversationId, socket]
  );

  const pinMessage = useCallback(
    (messageId: string, pin: boolean) => {
      if (!conversationId) return;
      socket.send({
        type: pin ? SOCKET_EVENT.pinMessage : SOCKET_EVENT.unpinMessage,
        request_id: createRequestId('pin'),
        conversation_id: conversationId,
        data: { message_id: messageId },
      });
    },
    [conversationId, socket]
  );

  const votePoll = useCallback(
    (pollId: string, optionIds: string[]) => {
      if (!conversationId) return;
      socket.send({
        type: SOCKET_EVENT.pollVote,
        request_id: createRequestId('poll-vote'),
        conversation_id: conversationId,
        data: { poll_id: pollId, option_ids: optionIds },
      });
    },
    [conversationId, socket]
  );

  const undoLatest = useCallback(() => {
    socket.send(buildUndoFrame(conversationId ?? undefined, createRequestId('undo')));
  }, [conversationId, socket]);

  const redoCommand = useCallback(
    (commandId: string) => {
      socket.send(buildRedoFrame(commandId, createRequestId('redo')));
    },
    [socket]
  );

  return {
    sendMessage,
    editMessage,
    deleteMessage,
    deleteMessages,
    reactToMessage,
    pinMessage,
    votePoll,
    undoLatest,
    redoCommand,
  };
}
