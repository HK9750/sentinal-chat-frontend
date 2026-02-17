export interface User {
  id: string;
  email: string;
  username: string;
  display_name: string;
  avatar_url?: string;
  status?: string;
  phone_number?: string;
  created_at?: string; // Optional: not returned from login/register endpoints
  bio?: string;
  is_online?: boolean;
  last_seen_at?: string;
}

export interface UserSettings {
  user_id: string;
  privacy_last_seen: 'EVERYONE' | 'CONTACTS' | 'NOBODY';
  privacy_profile_photo: 'EVERYONE' | 'CONTACTS' | 'NOBODY';
  privacy_about: 'EVERYONE' | 'CONTACTS' | 'NOBODY';
  privacy_groups: 'EVERYONE' | 'CONTACTS' | 'NOBODY';
  read_receipts: boolean;
  notifications_enabled: boolean;
  notification_sound: string;
  notification_vibrate: boolean;
  theme: 'LIGHT' | 'DARK' | 'SYSTEM';
  language: string;
  enter_to_send: boolean;
  media_auto_download_wifi: boolean;
  media_auto_download_mobile: boolean;
  updated_at: string;
}

export interface Device {
  id: string;
  device_name: string;
  device_type: string;
  last_active?: string;
  is_active: boolean;
}

export interface UserSession {
  id: string;
  device_id: string;
  device_name?: string;
  device_type?: string;
  ip_address?: string;
  last_active: string;
  created_at: string;
  is_current?: boolean;
}

export interface UserContact {
  user_id: string;
  contact_user_id: string;
  nickname?: string;
  is_blocked: boolean;
  created_at: string;
  contact?: User;
}

export interface PushToken {
  id: string;
  token: string;
  platform: string;
  created_at: string;
}
