export type ConversationType = 'DM' | 'GROUP';
export type ParticipantRole = 'OWNER' | 'ADMIN' | 'MEMBER';
export type DisappearingMode = 'OFF' | '24_HOURS' | '7_DAYS' | '90_DAYS';

export interface ConversationMessageSummary {
  id: string;
  sender_id: string;
  kind: string;
  content?: string | null;
  is_forwarded?: boolean;
  attachment_mime_type?: string | null;
  attachment_filename?: string | null;
  duration_seconds?: number | null;
  created_at: string;
  seq_id: number;
  receipt_status?: 'SENT' | 'DELIVERED' | 'READ' | 'PLAYED' | null;
  client_status?: 'PENDING' | 'SENT' | 'FAILED';
  deleted_at?: string | null;
}

export interface Participant {
  user_id: string;
  display_name: string;
  username: string;
  avatar_url: string;
  role: ParticipantRole;
  joined_at: string;
  muted_until?: string | null;
  archived: boolean;
  is_online: boolean;
  last_read_sequence: number;
}

export interface Conversation {
  id: string;
  type: ConversationType;
  subject?: string | null;
  description?: string | null;
  avatar_url?: string | null;
  disappearing_mode: DisappearingMode;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  last_message_at?: string | null;
  participants: Participant[];
  last_message?: ConversationMessageSummary | null;
  unread_count: number;
  last_read_sequence: number;
}

export interface ConversationListPayload {
  items: Conversation[];
  total: number;
}

export interface CreateConversationRequest {
  type: ConversationType;
  subject?: string;
  description?: string;
  avatar_url?: string;
  participant_ids: string[];
  disappearing_mode?: DisappearingMode;
}

export interface AddParticipantRequest {
  user_id: string;
  role?: ParticipantRole;
}

export interface ConversationParticipantsPayload {
  items: Participant[];
}

export interface ConversationClearPayload {
  cleared: boolean;
}

export interface DeleteConversationPayload {
  deleted: boolean;
}

export interface UpdateConversationRequest {
  disappearing_mode: DisappearingMode;
}

export interface CallHistoryItem {
  id: string;
  conversation_id: string;
  type: 'AUDIO' | 'VIDEO' | string;
  initiated_by: string;
  started_at: string;
  connected_at?: string | null;
  ended_at?: string | null;
  end_reason?: string | null;
  duration_seconds?: number | null;
}

export interface CallHistoryPayload {
  items: CallHistoryItem[];
  total: number;
}
