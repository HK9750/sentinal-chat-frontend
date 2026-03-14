import { apiClient, unwrapData } from '@/services/api-client';
import { API_ROUTES } from '@/lib/constants';
import type {
  AuthPayload,
  LoginRequest,
  OAuthAuthorizePayload,
  OAuthAuthorizeRequest,
  OAuthExchangeRequest,
  OAuthProvider,
  RegisterRequest,
  SessionsPayload,
} from '@/types';

export async function register(input: RegisterRequest): Promise<AuthPayload> {
  return unwrapData<AuthPayload>(apiClient.post(API_ROUTES.auth.register, input));
}

export async function login(input: LoginRequest): Promise<AuthPayload> {
  return unwrapData<AuthPayload>(apiClient.post(API_ROUTES.auth.login, input));
}

export async function getOAuthAuthorizeUrl(
  provider: OAuthProvider,
  input: OAuthAuthorizeRequest
): Promise<OAuthAuthorizePayload> {
  return unwrapData<OAuthAuthorizePayload>(
    apiClient.get(API_ROUTES.auth.oauthUrl(provider), {
      params: input,
    })
  );
}

export async function exchangeOAuthCode(
  provider: OAuthProvider,
  input: OAuthExchangeRequest
): Promise<AuthPayload> {
  return unwrapData<AuthPayload>(apiClient.post(API_ROUTES.auth.oauthExchange(provider), input));
}

export async function refresh(): Promise<AuthPayload> {
  return unwrapData<AuthPayload>(apiClient.post(API_ROUTES.auth.refresh));
}

export async function logout(sessionId?: string): Promise<void> {
  await unwrapData(apiClient.post(API_ROUTES.auth.logout, sessionId ? { session_id: sessionId } : undefined));
}

export async function logoutAll(): Promise<void> {
  await unwrapData(apiClient.post(API_ROUTES.auth.logoutAll));
}

export async function listSessions(): Promise<SessionsPayload> {
  return unwrapData<SessionsPayload>(apiClient.get(API_ROUTES.auth.sessions));
}
