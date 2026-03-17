'use client';

import { useCallback } from 'react';
import { createRequestId } from '@/lib/request-id';
import { buildReceiptFrame } from '@/services/message-service';
import { useSocket } from '@/providers/socket-provider';

export function useReceiptChannel(conversationId?: string | null) {
  const socket = useSocket();

  const sendDeliveredReceipt = useCallback(
    (messageIds: string[]) => {
      if (!conversationId || messageIds.length === 0) {
        return;
      }

      socket.send(
        buildReceiptFrame(conversationId, 'delivered', { message_ids: messageIds }, createRequestId('delivered'))
      );
    },
    [conversationId, socket]
  );

  const sendReadReceipt = useCallback(
    (messageIds: string[], upToSeqId?: number) => {
      if (!conversationId || messageIds.length === 0) {
        return;
      }

      socket.send(
        buildReceiptFrame(conversationId, 'read', { message_ids: messageIds, up_to_seq_id: upToSeqId }, createRequestId('read'))
      );
    },
    [conversationId, socket]
  );

  const sendPlayedReceipt = useCallback(
    (messageId: string) => {
      if (!conversationId) {
        return;
      }

      socket.send(
        buildReceiptFrame(conversationId, 'played', { message_ids: [messageId] }, createRequestId('played'))
      );
    },
    [conversationId, socket]
  );

  return {
    sendDeliveredReceipt,
    sendReadReceipt,
    sendPlayedReceipt,
  };
}
