import { mergeMessage } from '@/services/message-service';
import type { ConversationListPayload, ConversationMessageSummary, Message } from '@/types';

/**
 * Convert a Message to a ConversationMessageSummary for the sidebar preview.
 */
export function toConversationSummary(message: Message): ConversationMessageSummary {
  const receiptStatus = (message.receipts ?? [])
    .filter((r) => r.user_id !== message.sender_id)
    .reduce<ConversationMessageSummary['receipt_status']>((best, r) => {
      if (r.status === 'PLAYED') return 'PLAYED';
      if (r.status === 'READ' && best !== 'PLAYED') return 'READ';
      if (r.status === 'DELIVERED' && best === 'SENT') return 'DELIVERED';
      return best;
    }, 'SENT');

  const clientOverride: ConversationMessageSummary['receipt_status'] | null =
    message.client_status === 'PENDING' ? null : message.client_status === 'FAILED' ? 'SENT' : null;

  return {
    id: message.id,
    sender_id: message.sender_id,
    kind: message.type,
    created_at: message.created_at,
    seq_id: message.seq_id,
    receipt_status: clientOverride ?? receiptStatus,
    deleted_at: message.deleted_at,
  };
}

/**
 * Upsert a message into a sorted message list, deduplicating by id or client_message_id.
 */
export function upsertMessage(current: Message[] | undefined, incoming: Message): Message[] {
  const existing = (current ?? []).find(
    (item) => item.id === incoming.id || item.client_message_id === incoming.client_message_id
  );
  const merged = mergeMessage(existing, incoming);

  // Determine client_status: keep incoming's status if it has one (optimistic = PENDING),
  // otherwise if it's a server echo with a client_message_id, mark as SENT.
  const clientStatus = incoming.client_status ?? existing?.client_status ?? (merged.client_message_id ? 'SENT' as const : undefined);
  const mergedWithStatus = clientStatus ? { ...merged, client_status: clientStatus } : merged;

  const next = (current ?? []).filter(
    (item) => item.id !== incoming.id && item.client_message_id !== incoming.client_message_id
  );
  next.push(mergedWithStatus);
  return next.sort((a, b) => a.seq_id - b.seq_id);
}

/**
 * Update the conversation list sidebar with a message preview, re-sorting by most recent.
 */
export function updateConversationPreview(
  payload: ConversationListPayload | undefined,
  conversationId: string,
  message: Message
): ConversationListPayload | undefined {
  if (!payload) return payload;

  const items = payload.items.map((conv) => {
    if (conv.id !== conversationId) return conv;
    return {
      ...conv,
      updated_at: message.created_at,
      last_message_at: message.created_at,
      last_message: toConversationSummary(message),
    };
  });

  items.sort((a, b) => {
    const aTime = a.last_message_at ?? a.updated_at;
    const bTime = b.last_message_at ?? b.updated_at;
    return new Date(bTime).getTime() - new Date(aTime).getTime();
  });

  return { ...payload, items };
}

/**
 * Get the most advanced receipt status from a message's receipts (excluding sender).
 */
export function getMostAdvancedReceiptStatus(
  message: Message
): ConversationMessageSummary['receipt_status'] {
  return (message.receipts ?? [])
    .filter((r) => r.user_id !== message.sender_id)
    .reduce<ConversationMessageSummary['receipt_status']>((best, r) => {
      if (r.status === 'PLAYED') return 'PLAYED';
      if (r.status === 'READ' && best !== 'PLAYED') return 'READ';
      if (r.status === 'DELIVERED' && best === 'SENT') return 'DELIVERED';
      return best;
    }, 'SENT');
}

/**
 * Update the receipt_status on the last_message of a conversation in the sidebar.
 */
export function updateConversationLastMessageReceipt(
  payload: ConversationListPayload | undefined,
  conversationId: string,
  currentUserId: string,
  status: ConversationMessageSummary['receipt_status']
): ConversationListPayload | undefined {
  if (!payload) return payload;

  return {
    ...payload,
    items: payload.items.map((conv) => {
      if (conv.id !== conversationId || !conv.last_message) return conv;
      if (conv.last_message.sender_id !== currentUserId) return conv;
      return {
        ...conv,
        last_message: { ...conv.last_message, receipt_status: status },
      };
    }),
  };
}
