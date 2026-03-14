export interface DeviceDescriptor {
  id?: string | null;
  device_id?: string | null;
  device_name?: string | null;
  device_type?: string | null;
}

export type OAuthProvider = 'google' | 'github';
export type AuthProvider = 'password' | OAuthProvider;

export interface AuthUser {
  id: string;
  display_name: string;
  email?: string | null;
  username?: string | null;
  phone_number?: string | null;
  avatar_url?: string | null;
  is_verified: boolean;
}

export interface AuthSession {
  id: string;
  user_id: string;
  device: DeviceDescriptor;
  created_at: string;
  expires_at: string;
  auth_provider: AuthProvider;
  is_current: boolean;
}

export interface AuthTokens {
  access_token: string;
  token_type: string;
  expires_in: number;
  expires_at: string;
  refresh_token?: string | null;
  refresh_token_expires_at: string;
  refresh_token_set: boolean;
}

export interface AuthPayload {
  user: AuthUser;
  session: AuthSession;
  tokens: AuthTokens;
  auth_provider: AuthProvider;
  is_new_user?: boolean;
}

export interface ClientDeviceInput {
  device_id: string;
  device_name: string;
  device_type: string;
}

export interface RegisterRequest {
  display_name: string;
  email?: string;
  username?: string;
  phone_number?: string;
  password: string;
  device: ClientDeviceInput;
}

export interface LoginRequest {
  identifier: string;
  password: string;
  device: ClientDeviceInput;
}

export interface OAuthAuthorizeRequest {
  redirect_uri: string;
  code_challenge: string;
  state: string;
}

export interface OAuthAuthorizePayload {
  provider: OAuthProvider;
  authorization_url: string;
  redirect_uri: string;
  state: string;
}

export interface OAuthExchangeRequest {
  code: string;
  code_verifier: string;
  redirect_uri: string;
  device: ClientDeviceInput;
}

export interface SessionsPayload {
  items: AuthSession[];
}

export interface LocalUserPreferences {
  theme: 'system' | 'light' | 'dark';
  read_receipts: boolean;
  sound_enabled: boolean;
  enter_to_send: boolean;
  reduce_motion: boolean;
  compact_mode: boolean;
}

export interface ProfileMetrics {
  conversation_count: number;
  unread_count: number;
  session_count: number;
  secure_conversation_count: number;
}
