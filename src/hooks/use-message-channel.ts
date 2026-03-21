'use client';

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { updateConversationPreview, upsertMessage } from '@/lib/chat-helpers';
import { SOCKET_EVENT } from '@/lib/constants';
import { createClientMessageId, createMessageRequestId, createRequestId } from '@/lib/request-id';
import {
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
import type { ConversationListPayload, Message, MessageType } from '@/types';

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
    reactToMessage,
    pinMessage,
    votePoll,
    undoLatest,
    redoCommand,
  };
}
