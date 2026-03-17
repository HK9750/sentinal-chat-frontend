import type { Attachment, BackendMessageAttachment } from '@/types/upload';

export type MessageType = 'TEXT' | 'AUDIO' | 'FILE' | 'POLL' | 'SYSTEM';
export type DeliveryStatus = 'SENT' | 'DELIVERED' | 'READ' | 'PLAYED';

export interface MessageSummary {
  id: string;
  sender_id: string;
  kind: string;
  created_at: string;
  seq_id: number;
  deleted_at?: string | null;
}

export interface MessageReceipt {
  user_id: string;
  status: DeliveryStatus;
  delivered_at?: string | null;
  read_at?: string | null;
  played_at?: string | null;
  updated_at: string;
}

export interface MessageReaction {
  user_id: string;
  reaction_code: string;
  created_at: string;
}

export interface PollOption {
  id: string;
  text: string;
  position: number;
  votes: number;
}

export interface Poll {
  id: string;
  question: string;
  allows_multiple: boolean;
  closes_at?: string | null;
  closed: boolean;
  options: PollOption[];
  my_votes?: string[];
}

export interface BackendMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  client_message_id?: string | null;
  seq_id: number;
  type: MessageType;
  content?: string | null;
  is_forwarded: boolean;
  reply_to_msg_id?: string | null;
  mention_count: number;
  created_at: string;
  edited_at?: string | null;
  deleted_at?: string | null;
  expires_at?: string | null;
  attachments?: BackendMessageAttachment[];
  receipts?: MessageReceipt[];
  reactions?: MessageReaction[];
  poll?: Poll | null;
  pinned: boolean;
  is_starred: boolean;
}

export interface Message extends Omit<BackendMessage, 'attachments'> {
  attachments: Attachment[];
}

export interface MessagesPayload {
  items: Message[];
}

export interface MessageDraft {
  text: string;
  files: File[];
  reply_to_message_id?: string;
}

export interface SendMessageFrameData {
  client_message_id: string;
  type: MessageType;
  content: string;
  attachment_ids?: string[];
  reply_to_msg_id?: string;
  expires_at?: string;
}

export interface EditMessageFrameData {
  message_id: string;
  content: string;
  expires_at?: string;
}

export interface DeleteMessageFrameData {
  message_id: string;
}

export interface ReceiptFrameData {
  message_ids: string[];
  up_to_seq_id?: number;
}

export interface ReactionFrameData {
  message_id: string;
  reaction_code: string;
}

export type MessagePayloadByKind =
  | { kind: 'text'; text: string }
  | { kind: 'file'; caption?: string; files: Attachment[] }
  | { kind: 'audio'; transcript?: string; duration_ms?: number; clips: Attachment[] }
  | { kind: 'system'; text: string };
