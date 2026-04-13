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

  let attachment_mime_type = null;
  let attachment_filename = null;
  let duration_seconds = null;

  if (message.attachments && message.attachments.length > 0) {
    const primary = message.attachments[0];
    attachment_mime_type = primary.mime_type;
    attachment_filename = primary.filename ?? null;
    duration_seconds = primary.duration_seconds ?? null;
  }

  const summaryContent = message.content
    ? message.is_forwarded
      ? `Forwarded: ${message.content}`
      : message.content
    : message.content;

  return {
    id: message.id,
    sender_id: message.sender_id,
    kind: message.type,
    content: summaryContent,
    is_forwarded: message.is_forwarded,
    attachment_mime_type,
    attachment_filename,
    duration_seconds,
    created_at: message.created_at,
    seq_id: message.seq_id,
    receipt_status: clientOverride ?? receiptStatus,
    client_status: message.client_status,
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

  // If incoming has no client_status, it's a server echo. We should clear any PENDING state.
  // FAILED state shouldn't be overridden by a generic update unless we specifically want to retry.
  let clientStatus = incoming.client_status;
  let clearClientStatus = false;
  if (!clientStatus) {
    if (existing?.client_status === 'PENDING') {
      clearClientStatus = true; // Server has accepted it, no longer pending
    } else {
      clientStatus = existing?.client_status;
    }
  }

  const mergedWithStatus = clearClientStatus
    ? { ...merged, client_status: undefined }
    : clientStatus
      ? { ...merged, client_status: clientStatus }
      : merged;

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
