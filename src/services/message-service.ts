import { apiClient, unwrapData } from '@/services/api-client';
import { API_ROUTES, MESSAGES_PER_PAGE, SOCKET_EVENT } from '@/lib/constants';
import type {
  Attachment,
  BackendMessage,
  ClientSocketFrame,
  Message,
  MessageReceipt,
  MessageType,
  ReceiptFrameData,
  ReactionFrameData,
  SendMessageFrameData,
  EditMessageFrameData,
} from '@/types';

interface MessageItemsPayload {
  items: BackendMessage[];
}

function normalizeAttachment(attachment: {
  id: string;
  file_url?: string;
  filename?: string | null;
  mime_type: string;
  size_bytes: number;
  view_once: boolean;
  viewed_at?: string | null;
  thumbnail_url?: string | null;
  width?: number | null;
  height?: number | null;
  duration_seconds?: number | null;
}): Attachment {
  return {
    id: attachment.id,
    file_url: attachment.file_url ?? '',
    filename: attachment.filename ?? null,
    mime_type: attachment.mime_type,
    size_bytes: attachment.size_bytes,
    view_once: attachment.view_once,
    viewed_at: attachment.viewed_at ?? null,
    thumbnail_url: attachment.thumbnail_url ?? null,
    width: attachment.width ?? null,
    height: attachment.height ?? null,
    duration_seconds: attachment.duration_seconds ?? null,
  };
}

export function normalizeMessage(message: BackendMessage): Message {
  return {
    ...message,
    attachments: (message.attachments ?? []).map(normalizeAttachment),
  };
}

function deliveryRank(status: MessageReceipt['status']): number {
  switch (status) {
    case 'PLAYED':
      return 3;
    case 'READ':
      return 2;
    case 'DELIVERED':
      return 1;
    default:
      return 0;
  }
}

function mergeReceipt(current: MessageReceipt | undefined, incoming: MessageReceipt): MessageReceipt {
  if (!current) {
    return incoming;
  }

  const next = deliveryRank(incoming.status) >= deliveryRank(current.status) ? incoming.status : current.status;

  return {
    user_id: incoming.user_id,
    status: next,
    delivered_at: incoming.delivered_at ?? current.delivered_at ?? null,
    read_at: incoming.read_at ?? current.read_at ?? null,
    played_at: incoming.played_at ?? current.played_at ?? null,
    updated_at: incoming.updated_at ?? current.updated_at,
  };
}

export function mergeMessage(existing: Message | undefined, incoming: BackendMessage | Message): Message {
  const normalized = normalizeMessage(incoming as BackendMessage);

  if (!existing) {
    return normalized;
  }

  const receipts = new Map<string, MessageReceipt>();
  for (const receipt of existing.receipts ?? []) {
    receipts.set(receipt.user_id, receipt);
  }
  for (const receipt of normalized.receipts ?? []) {
    receipts.set(receipt.user_id, mergeReceipt(receipts.get(receipt.user_id), receipt));
  }

  return {
    ...existing,
    ...normalized,
    attachments: normalized.attachments.length > 0 ? normalized.attachments : existing.attachments,
    reactions: normalized.reactions ?? existing.reactions,
    receipts: Array.from(receipts.values()),
    poll: normalized.poll ?? existing.poll,
  };
}

export async function getConversationMessages(
  conversationId: string,
  beforeSeq?: number,
  limit = MESSAGES_PER_PAGE
): Promise<Message[]> {
  const payload = await unwrapData<MessageItemsPayload>(
    apiClient.get(API_ROUTES.conversations.messages(conversationId), {
      params: { before_seq: beforeSeq, limit },
    })
  );

  return payload.items.map(normalizeMessage).sort((left, right) => left.seq_id - right.seq_id);
}

export async function getMessage(messageId: string): Promise<Message> {
  const message = await unwrapData<BackendMessage>(apiClient.get(API_ROUTES.messages.detail(messageId)));
  return normalizeMessage(message);
}

export function createOptimisticMessage(input: {
  conversationId: string;
  senderId: string;
  clientMessageId: string;
  type: MessageType;
  content: string;
  attachments?: Attachment[];
  replyToMessageId?: string;
}): Message {
  const now = new Date().toISOString();

  return {
    id: `optimistic:${input.clientMessageId}`,
    conversation_id: input.conversationId,
    sender_id: input.senderId,
    client_message_id: input.clientMessageId,
    seq_id: Date.now(),
    type: input.type,
    content: input.content,
    is_forwarded: false,
    reply_to_msg_id: input.replyToMessageId ?? null,
    mention_count: 0,
    created_at: now,
    edited_at: null,
    deleted_at: null,
    expires_at: null,
    attachments: input.attachments ?? [],
    receipts: [{ user_id: input.senderId, status: 'SENT', updated_at: now }],
    reactions: [],
    poll: null,
    pinned: false,
    is_starred: false,
  };
}

export function buildSendMessageFrame(
  conversationId: string,
  data: SendMessageFrameData,
  requestId?: string
): ClientSocketFrame<SendMessageFrameData> {
  return {
    type: SOCKET_EVENT.messageSend,
    request_id: requestId,
    conversation_id: conversationId,
    data,
  };
}

export function buildEditMessageFrame(
  conversationId: string,
  data: EditMessageFrameData,
  requestId?: string
): ClientSocketFrame<EditMessageFrameData> {
  return {
    type: SOCKET_EVENT.messageEdit,
    request_id: requestId,
    conversation_id: conversationId,
    data,
  };
}

export function buildDeleteMessageFrame(
  conversationId: string,
  messageId: string,
  requestId?: string
): ClientSocketFrame<{ message_id: string }> {
  return {
    type: SOCKET_EVENT.messageDelete,
    request_id: requestId,
    conversation_id: conversationId,
    data: { message_id: messageId },
  };
}

export function buildReactionFrame(
  conversationId: string,
  data: ReactionFrameData,
  mode: 'add' | 'remove',
  requestId?: string
): ClientSocketFrame<ReactionFrameData> {
  return {
    type: mode === 'add' ? SOCKET_EVENT.reactionAdd : SOCKET_EVENT.reactionRemove,
    request_id: requestId,
    conversation_id: conversationId,
    data,
  };
}

export function buildPinFrame(
  conversationId: string,
  messageId: string,
  pinned: boolean,
  requestId?: string
): ClientSocketFrame<{ message_id: string }> {
  return {
    type: pinned ? SOCKET_EVENT.pinMessage : SOCKET_EVENT.unpinMessage,
    request_id: requestId,
    conversation_id: conversationId,
    data: { message_id: messageId },
  };
}

export function buildReceiptFrame(
  conversationId: string,
  status: 'delivered' | 'read' | 'played',
  data: ReceiptFrameData,
  requestId?: string
): ClientSocketFrame<ReceiptFrameData> {
  const type =
    status === 'delivered'
      ? SOCKET_EVENT.receiptDelivered
      : status === 'played'
        ? SOCKET_EVENT.receiptPlayed
        : SOCKET_EVENT.receiptRead;

  return {
    type,
    request_id: requestId,
    conversation_id: conversationId,
    data,
  };
}

export function upsertReceiptState(
  messages: Message[] | undefined,
  userId: string,
  status: string,
  messageIds: string[]
): Message[] {
  if (!messages || messageIds.length === 0) {
    return messages ?? [];
  }

  const normalizedStatus = status.toUpperCase() as MessageReceipt['status'];
  const now = new Date().toISOString();

  return messages.map((message) => {
    if (!messageIds.includes(message.id)) {
      return message;
    }

    const receipts = [...(message.receipts ?? [])];
    const existingIndex = receipts.findIndex((receipt) => receipt.user_id === userId);
    const current = existingIndex >= 0 ? receipts[existingIndex] : null;
    const nextReceipt: MessageReceipt = {
      user_id: userId,
      status: current && deliveryRank(current.status) > deliveryRank(normalizedStatus) ? current.status : normalizedStatus,
      delivered_at:
        normalizedStatus === 'DELIVERED' || normalizedStatus === 'READ' || normalizedStatus === 'PLAYED'
          ? current?.delivered_at ?? now
          : current?.delivered_at,
      read_at:
        normalizedStatus === 'READ' || normalizedStatus === 'PLAYED' ? current?.read_at ?? now : current?.read_at,
      played_at: normalizedStatus === 'PLAYED' ? current?.played_at ?? now : current?.played_at,
      updated_at: now,
    };

    if (existingIndex >= 0) {
      receipts[existingIndex] = nextReceipt;
    } else {
      receipts.push(nextReceipt);
    }

    return {
      ...message,
      receipts,
    };
  });
}

export function buildUndoFrame(conversationId?: string, requestId?: string): ClientSocketFrame {
  return {
    type: SOCKET_EVENT.commandUndo,
    request_id: requestId,
    conversation_id: conversationId,
  };
}

export function buildRedoFrame(commandId: string, requestId?: string): ClientSocketFrame<{ command_id: string }> {
  return {
    type: SOCKET_EVENT.commandRedo,
    request_id: requestId,
    data: { command_id: commandId },
  };
}
