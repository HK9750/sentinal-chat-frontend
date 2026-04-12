export type NotificationType =
  | 'MESSAGE_NEW'
  | 'CALL_MISSED'
  | 'SYSTEM'
  | string;

export interface NotificationItem {
  id: string;
  user_id: string;
  actor_id?: string | null;
  conversation_id?: string | null;
  message_id?: string | null;
  call_id?: string | null;
  type: NotificationType;
  title: string;
  body: string;
  deep_link: string;
  metadata?: Record<string, unknown>;
  is_read: boolean;
  read_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface NotificationSettings {
  in_app_enabled: boolean;
  sound_enabled: boolean;
  show_message_preview: boolean;
}

export interface NotificationListPayload {
  items: NotificationItem[];
  total: number;
}

export interface MarkNotificationReadPayload {
  read: boolean;
}

export interface MarkAllNotificationsReadPayload {
  updated: number;
}
