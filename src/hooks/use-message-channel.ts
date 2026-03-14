'use client';

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { SOCKET_EVENT } from '@/lib/constants';
import { createClientMessageId, createRequestId } from '@/lib/crypto';
import { buildDeleteMessageFrame, buildEditMessageFrame, buildReactionFrame, buildSendMessageFrame, normalizeMessage } from '@/services/message-service';
import { queryKeys } from '@/queries/query-keys';
import { useSocketEvents } from '@/hooks/use-socket-events';
import { useSocket } from '@/providers/socket-provider';
import type { Message, MessageType, SocketEnvelope } from '@/types';

function appendMessage(messages: Message[] | undefined, message: Message): Message[] {
  const current = messages ?? [];
  const withoutDuplicate = current.filter((item) => item.id !== message.id && item.client_message_id !== message.client_message_id);
  return [...withoutDuplicate, message].sort((left, right) => left.seq_id - right.seq_id);
}

export function useMessageChannel(conversationId?: string | null) {
  const socket = useSocket();
  const queryClient = useQueryClient();

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
    (encryptedContent: string, type: MessageType, attachmentIds: string[] = [], replyToMessageId?: string) => {
      if (!conversationId) {
        return null;
      }

      const clientMessageId = createClientMessageId();
      socket.send(
        buildSendMessageFrame(
          conversationId,
          {
            client_message_id: clientMessageId,
            type,
            encrypted_content: encryptedContent,
            attachment_ids: attachmentIds.length > 0 ? attachmentIds : undefined,
            reply_to_msg_id: replyToMessageId,
          },
          createRequestId('send')
        )
      );

      return clientMessageId;
    },
    [conversationId, socket]
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
