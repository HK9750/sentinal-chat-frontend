export interface Broadcast {
  id: string;
  name: string;
  description?: string;
  owner_id: string;
  recipient_count: number;
  created_at: string;
}

export interface BroadcastRecipient {
  broadcast_id: string;
  user_id: string;
  added_at: string;
  username?: string;
  avatar_url?: string;
}
