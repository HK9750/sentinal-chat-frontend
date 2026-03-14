'use client';

import { useCallback } from 'react';
import { createRequestId } from '@/lib/crypto';
import { buildReceiptFrame } from '@/services/message-service';
import { useSocket } from '@/providers/socket-provider';

export function useReceiptChannel(conversationId?: string | null) {
  const socket = useSocket();

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
    sendReadReceipt,
    sendPlayedReceipt,
  };
}
