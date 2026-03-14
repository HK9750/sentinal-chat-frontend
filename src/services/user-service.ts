import { DEFAULT_PREFERENCES, STORAGE_KEYS } from '@/lib/constants';
import { getCryptoVaultState } from '@/lib/crypto-storage';
import { listSessions } from '@/services/auth-service';
import { listConversations } from '@/services/conversation-service';
import type { AuthSession, LocalUserPreferences, ProfileMetrics } from '@/types';

interface StoredUiState {
  state?: {
    sidebarCollapsed?: boolean;
    preferences?: Partial<LocalUserPreferences>;
  };
}

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function readLocalPreferences(): LocalUserPreferences {
  if (!canUseStorage()) {
    return DEFAULT_PREFERENCES;
  }

  const value = window.localStorage.getItem(STORAGE_KEYS.ui);

  if (!value) {
    return DEFAULT_PREFERENCES;
  }

  try {
    const parsed = JSON.parse(value) as StoredUiState | Partial<LocalUserPreferences>;
    const preferences = 'state' in parsed ? parsed.state?.preferences : parsed;
    return { ...DEFAULT_PREFERENCES, ...(preferences ?? {}) };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function writeLocalPreferences(nextPreferences: LocalUserPreferences): LocalUserPreferences {
  if (canUseStorage()) {
    const existing = window.localStorage.getItem(STORAGE_KEYS.ui);

    try {
      const parsed = existing ? (JSON.parse(existing) as StoredUiState) : undefined;
      window.localStorage.setItem(
        STORAGE_KEYS.ui,
        JSON.stringify({
          ...(parsed ?? {}),
          state: {
            ...(parsed?.state ?? {}),
            preferences: nextPreferences,
          },
        })
      );
    } catch {
      window.localStorage.setItem(
        STORAGE_KEYS.ui,
        JSON.stringify({
          state: {
            preferences: nextPreferences,
          },
        })
      );
    }
  }

  return nextPreferences;
}

export async function getProfileMetrics(): Promise<ProfileMetrics> {
  const [sessionsPayload, conversationPayload] = await Promise.all([
    listSessions().catch(() => ({ items: [] })),
    listConversations().catch(() => ({ items: [], total: 0 })),
  ]);

  const cryptoVault = getCryptoVaultState();

  return {
    conversation_count: conversationPayload.total,
    unread_count: conversationPayload.items.reduce((total, conversation) => total + conversation.unread_count, 0),
    session_count: sessionsPayload.items.length,
    secure_conversation_count: cryptoVault.stored_keys,
  };
}

export async function updateProfile(input: {
  display_name?: string;
  email?: string;
  username?: string;
  phone_number?: string;
  avatar_url?: string | null;
}): Promise<typeof input> {
  return input;
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
