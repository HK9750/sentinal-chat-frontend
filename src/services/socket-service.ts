import { API_ROUTES } from '@/lib/constants';
import type { ClientSocketFrame, SocketEnvelope } from '@/types';

function normalizeSocketBaseUrl(baseUrl: string): string {
  const trimmed = baseUrl.replace(/\/$/, '');

  if (trimmed.endsWith(API_ROUTES.websocket)) {
    return trimmed;
  }

  return `${trimmed}${API_ROUTES.websocket}`;
}

export function buildSocketUrl(baseUrl: string, token: string): string {
  const endpoint = normalizeSocketBaseUrl(baseUrl)
    .replace(/^http:/, 'ws:')
    .replace(/^https:/, 'wss:');

  const url = new URL(endpoint);
  url.searchParams.set('token', token);
  return url.toString();
}

export function serializeSocketFrame<T>(frame: ClientSocketFrame<T>): string {
  return JSON.stringify(frame);
}

export function parseSocketEnvelope(raw: string): SocketEnvelope {
  return JSON.parse(raw) as SocketEnvelope;
}
