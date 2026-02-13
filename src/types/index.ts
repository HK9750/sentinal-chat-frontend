// User types
export * from './user';

// Message types
export * from './message';

// Conversation types
export * from './conversation';

// Call types
export * from './call';

// Broadcast types
export * from './broadcast';

// Upload types
export * from './upload';

// Encryption types
export * from './encryption';

// Common types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  expires_at: string;
  session_id: string;
}

// WebSocket types
export interface WebSocketEvent {
  type: string;
  timestamp: string;
  user_id?: string;
  conversation_id?: string;
  payload?: unknown;
}

export interface WebSocketMessageNewEvent extends WebSocketEvent {
  type: 'message:new';
  payload: {
    message_id: string;
    conversation_id: string;
    sender_id: string;
    content?: string;
  };
}

export interface WebSocketMessageReadEvent extends WebSocketEvent {
  type: 'message:read';
  payload: {
    message_id: string;
    conversation_id: string;
    reader_id: string;
  };
}

export interface WebSocketTypingEvent extends WebSocketEvent {
  type: 'typing:started' | 'typing:stopped';
  payload: {
    conversation_id: string;
    user_id: string;
    display_name: string;
    is_typing: boolean;
  };
}

export interface WebSocketPresenceEvent extends WebSocketEvent {
  type: 'presence:online' | 'presence:offline';
  payload: {
    user_id: string;
    is_online: boolean;
    status?: string;
  };
}

export interface WebSocketCallEvent extends WebSocketEvent {
  type: 'call:offer' | 'call:answer' | 'call:ice' | 'call:ended';
  payload: {
    call_id: string;
    from_id: string;
    to_id: string;
    signal_type?: string;
    data?: string;
    reason?: string;
  };
}

export type WebSocketClientMessage =
  | { type: 'typing:start'; conversation_id: string }
  | { type: 'typing:stop'; conversation_id: string }
  | { type: 'read'; message_id: string }
  | { type: 'ping' };

// Request DTOs
export interface RegisterRequest {
  email: string;
  username: string;
  phone_number?: string;
  password: string;
  display_name?: string;
  device_id: string;
  device_name?: string;
  device_type?: string;
}

export interface LoginRequest {
  identity: string;
  password: string;
  device_id: string;
  device_name?: string;
  device_type?: string;
}

export interface RefreshRequest {
  session_id: string;
  refresh_token: string;
}

export interface SendMessageRequest {
  conversation_id: string;
  ciphertexts: Array<{
    recipient_device_id: string;
    ciphertext: string;
    header?: Record<string, unknown>;
  }>;
  message_type?: string;
  client_message_id?: string;
  idempotency_key?: string;
}

export interface CreateConversationRequest {
  type: 'DM' | 'GROUP';
  subject?: string;
  description?: string;
  participants: string[];
}

export interface UpdateProfileRequest {
  display_name?: string;
  avatar_url?: string;
  bio?: string;
  status?: string;
}

export interface UpdateSettingsRequest {
  notifications_enabled?: boolean;
  theme?: 'LIGHT' | 'DARK' | 'SYSTEM';
  language?: string;
}
