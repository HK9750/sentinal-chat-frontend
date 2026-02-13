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
  conversation_id: string;
  user_id: string;
  username?: string;
  role: ParticipantRole;
  joined_at: string;
  added_by?: string;
  muted_until?: string;
  pinned_at?: string;
  archived: boolean;
  last_read_sequence: number;
  permissions?: Record<string, boolean>;
  user?: {
    id: string;
    display_name: string;
    avatar_url?: string;
    status?: string;
    is_online?: boolean;
  };
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
