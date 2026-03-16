'use client';

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { SOCKET_EVENT } from '@/lib/constants';
import { createClientMessageId, createRequestId } from '@/lib/crypto';
import { buildDeleteMessageFrame, buildEditMessageFrame, buildReactionFrame, buildSendMessageFrame, createOptimisticMessage, normalizeMessage } from '@/services/message-service';
import { queryKeys } from '@/queries/query-keys';
import { useSocketEvents } from '@/hooks/use-socket-events';
import { useSocket } from '@/providers/socket-provider';
import { useAuthStore } from '@/stores/auth-store';
import type { ConversationListPayload, ConversationMessageSummary, Message, MessageType, SocketEnvelope } from '@/types';

function appendMessage(messages: Message[] | undefined, message: Message): Message[] {
  const current = messages ?? [];
  const withoutDuplicate = current.filter((item) => item.id !== message.id && item.client_message_id !== message.client_message_id);
  return [...withoutDuplicate, message].sort((left, right) => left.seq_id - right.seq_id);
}

function toConversationSummary(message: Message): ConversationMessageSummary {
  return {
    id: message.id,
    sender_id: message.sender_id,
    kind: message.type,
    created_at: message.created_at,
    seq_id: message.seq_id,
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

  useSocketEvents(
    useCallback(
      (envelope: SocketEnvelope) => {
        if (!conversationId || envelope.conversation_id !== conversationId) {
          return;
        }

        if (
          envelope.type === SOCKET_EVENT.messageNew ||
          envelope.type === SOCKET_EVENT.messageEdited ||
          envelope.type === SOCKET_EVENT.messageDeleted
        ) {
          const incoming = (envelope.data as { message?: Message } | undefined)?.message;

          if (!incoming) {
            return;
          }

          const normalized = normalizeMessage(incoming as never);
          queryClient.setQueryData<Message[]>(queryKeys.messages(conversationId), (messages) => appendMessage(messages, normalized));
        }

        if (envelope.type === SOCKET_EVENT.receiptUpdate) {
          queryClient.invalidateQueries({ queryKey: queryKeys.messages(conversationId) });
        }
      },
      [conversationId, queryClient]
    )
  );

  const sendMessage = useCallback(
    (
      encryptedContent: string,
      type: MessageType,
      attachmentIds: string[] = [],
      replyToMessageId?: string,
      keyFingerprint?: string
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
            encryptedContent,
            keyFingerprint,
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
            encrypted_content: encryptedContent,
            key_fingerprint: keyFingerprint,
            attachment_ids: attachmentIds.length > 0 ? attachmentIds : undefined,
            reply_to_msg_id: replyToMessageId,
          },
          createRequestId('send')
        )
      );

      return clientMessageId;
    },
    [conversationId, currentUserId, queryClient, socket]
  );

  const editMessage = useCallback(
    (messageId: string, encryptedContent: string) => {
      if (!conversationId) {
        return;
      }

      socket.send(
        buildEditMessageFrame(
          conversationId,
          { message_id: messageId, encrypted_content: encryptedContent },
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

  return {
    sendMessage,
    editMessage,
    deleteMessage,
    reactToMessage,
  };
}
