import { apiClient, unwrapData } from '@/services/api-client';
import { API_ROUTES, MESSAGES_PER_PAGE, SOCKET_EVENT } from '@/lib/constants';
import type {
  Attachment,
  BackendMessage,
  ClientSocketFrame,
  DecryptedMessageState,
  Message,
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
  encrypted_url?: string;
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
    encrypted_url: attachment.encrypted_url ?? attachment.file_url ?? '',
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
  encryptedContent: string;
  keyFingerprint?: string;
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
    encrypted_content: input.encryptedContent,
    key_fingerprint: input.keyFingerprint ?? null,
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

export function isDecryptableMessage(message: Message): boolean {
  return Boolean(message.encrypted_content) && !message.deleted_at;
}

export function toMessageDeletionState(message: Message): DecryptedMessageState {
  if (message.deleted_at) {
    return {
      status: 'ready',
      payload: { kind: 'system', text: 'This message was removed.' },
    };
  }

  return { status: 'empty' };
}
