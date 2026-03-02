export type ConversationType = 'DM' | 'GROUP';
export type ParticipantRole = 'OWNER' | 'ADMIN' | 'MEMBER';
export type DisappearingMode = 'OFF' | 'TIMER' | 'AFTER_READ';

export interface Conversation {
  id: string;
  type: ConversationType;
  subject?: string;
  description?: string;
  avatar_url?: string;
  creator_id: string;
  invite_link?: string;
  participant_count: number;
  participants?: Participant[];
  last_message_at?: string;
  created_at: string;
  updated_at: string;
  expiry_seconds?: number;
  disappearing_mode: DisappearingMode;
  message_expiry_seconds?: number;
  unread_count?: number;
  last_message?: {
    id: string;
    content?: string;
    sender_id: string;
    created_at: string;
  };
}

export interface Participant {
  user_id: string;
  username?: string;
  display_name?: string;
  avatar_url?: string;
  is_online?: boolean;
  role: ParticipantRole;
  joined_at: string;
  device_ids?: string[];
}

export interface ConversationSequence {
  conversation_id: string;
  last_sequence: number;
  updated_at: string;
}

export interface TypingIndicator {
  conversation_id: string;
  user_id: string;
  display_name: string;
  is_typing: boolean;
}
