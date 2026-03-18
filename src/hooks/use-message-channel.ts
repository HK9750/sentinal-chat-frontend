'use client';

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createClientMessageId, createMessageRequestId, createRequestId } from '@/lib/request-id';
import {
  buildDeleteMessageFrame,
  buildEditMessageFrame,
  buildReactionFrame,
  buildRedoFrame,
  buildSendMessageFrame,
  buildUndoFrame,
  createOptimisticMessage,
  mergeMessage,
} from '@/services/message-service';
import { queryKeys } from '@/queries/query-keys';
import { useSocket } from '@/providers/socket-provider';
import { useAuthStore } from '@/stores/auth-store';
import type { ConversationListPayload, ConversationMessageSummary, Message, MessageType } from '@/types';

function appendMessage(messages: Message[] | undefined, message: Message): Message[] {
  const current = messages ?? [];
  const existing = current.find((item) => item.id === message.id || item.client_message_id === message.client_message_id);
  const merged = mergeMessage(existing, message);
  const withoutDuplicate = current.filter((item) => item.id !== message.id && item.client_message_id !== message.client_message_id);
  return [...withoutDuplicate, merged].sort((left, right) => left.seq_id - right.seq_id);
}

function toConversationSummary(message: Message): ConversationMessageSummary {
  return {
    id: message.id,
    sender_id: message.sender_id,
    kind: message.type,
    created_at: message.created_at,
    seq_id: message.seq_id,
    receipt_status: message.receipts
      ?.filter((receipt) => receipt.user_id !== message.sender_id)
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
      }, 'SENT') ?? 'SENT',
    deleted_at: message.deleted_at,
  };
}

function updateConversationPreview(
  payload: ConversationListPayload | undefined,
  conversationId: string,
  message: Message,
): ConversationListPayload | undefined {
  if (!payload) {
    return payload;
  }

  const nextItems = payload.items.map((conversation) => {
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

  nextItems.sort((left, right) => {
    const leftTime = left.last_message_at ?? left.updated_at;
    const rightTime = right.last_message_at ?? right.updated_at;
    return new Date(rightTime).getTime() - new Date(leftTime).getTime();
  });

  return {
    ...payload,
    items: nextItems,
  };
}

export function useMessageChannel(conversationId?: string | null) {
  const socket = useSocket();
  const queryClient = useQueryClient();
  const currentUserId = useAuthStore((state) => state.user?.id);

  const sendMessage = useCallback(
    (
      content: string,
      type: MessageType,
      attachmentIds: string[] = [],
      replyToMessageId?: string
    ) => {
      if (!conversationId) {
        return null;
      }

      const clientMessageId = createClientMessageId();

      if (currentUserId) {
        const optimisticMessage = createOptimisticMessage({
          conversationId,
            senderId: currentUserId,
            clientMessageId,
            type,
            content,
            replyToMessageId,
          });

        queryClient.setQueryData<Message[]>(queryKeys.messages(conversationId), (messages) => appendMessage(messages, optimisticMessage));
        queryClient.setQueryData<ConversationListPayload>(
          queryKeys.conversations,
          (payload) => updateConversationPreview(payload, conversationId, optimisticMessage),
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
      if (!conversationId) {
        return;
      }

      socket.send(
        buildEditMessageFrame(
          conversationId,
          { message_id: messageId, content },
          createRequestId('edit')
        )
      );
    },
    [conversationId, socket]
  );

  const deleteMessage = useCallback(
    (messageId: string) => {
      if (!conversationId) {
        return;
      }

      socket.send(buildDeleteMessageFrame(conversationId, messageId, createRequestId('delete')));
    },
    [conversationId, socket]
  );

  const reactToMessage = useCallback(
    (messageId: string, reactionCode: string, mode: 'add' | 'remove') => {
      if (!conversationId) {
        return;
      }

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
    undoLatest,
    redoCommand,
  };
}
