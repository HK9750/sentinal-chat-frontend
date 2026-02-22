export type MessageType =
  | 'text'
  | 'image'
  | 'video'
  | 'audio'
  | 'file'
  | 'location'
  | 'contact'
  | 'poll';

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  client_message_id?: string;
  sequence_number: number;
  message_type?: MessageType;
  content?: string;
  metadata?: Record<string, unknown>;
  is_forwarded?: boolean;
  is_deleted: boolean;
  is_edited: boolean;
  reply_to_msg_id?: string;
  poll_id?: string;
  mention_count?: number;
  created_at: string;
  updated_at?: string;
  edited_at?: string;
  deleted_at?: string;
  ciphertext?: string;
  header?: string;
  recipient_device_id?: string;
  sender_device_id?: string;
  sender?: {
    id: string;
    display_name: string;
    avatar_url?: string;
  };
}

export interface MessageCiphertext {
  id: string;
  message_id: string;
  recipient_user_id: string;
  recipient_device_id: string;
  sender_device_id?: string;
  ciphertext: string;
  header?: string;
  created_at: string;
}

export interface MessageReaction {
  id: string;
  message_id: string;
  user_id: string;
  reaction_code: string;
  created_at: string;
}

export interface MessageReceipt {
  message_id: string;
  user_id: string;
  status: 'PENDING' | 'DELIVERED' | 'READ' | 'PLAYED';
  delivered_at?: string;
  read_at?: string;
  played_at?: string;
  updated_at: string;
}

export interface MessageMention {
  message_id: string;
  user_id: string;
  offset: number;
  length: number;
}

export interface StarredMessage {
  user_id: string;
  message_id: string;
  starred_at: string;
  message?: Message;
}
