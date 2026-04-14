import { listSessions } from '@/services/auth-service';
import { listConversations } from '@/services/conversation-service';
import { updateMyProfile } from '@/services/user-service-api';
import type { AuthSession, ProfileMetrics } from '@/types';

export async function getProfileMetrics(): Promise<ProfileMetrics> {
  const [sessionsPayload, conversationPayload] = await Promise.all([
    listSessions().catch(() => ({ items: [] })),
    listConversations().catch(() => ({ items: [], total: 0 })),
  ]);
  return {
    conversation_count: conversationPayload.total,
    unread_count: conversationPayload.items.reduce((total, conversation) => total + conversation.unread_count, 0),
    session_count: sessionsPayload.items.length,
  };
}

export async function updateProfile(input: {
  display_name?: string;
  email?: string;
  phone_number?: string;
  avatar_url?: string;
}): Promise<{
  id: string;
  display_name: string;
  email?: string | null;
  username?: string | null;
  phone_number?: string | null;
  avatar_url?: string | null;
  is_verified: boolean;
}> {
  return updateMyProfile(input);
}

export function mapSessionsToDevices(sessions: AuthSession[]) {
  return sessions.map((session) => ({
    session_id: session.id,
    device_id: session.device.device_id ?? session.device.id ?? 'unknown-device',
    name: session.device.device_name ?? 'Unknown device',
    type: session.device.device_type ?? 'unknown',
    created_at: session.created_at,
    expires_at: session.expires_at,
    is_current: session.is_current,
  }));
}
