import { API_ROUTES } from '@/lib/constants';
import type { ClientSocketFrame, SocketEnvelope } from '@/types';

function normalizeSocketBaseUrl(baseUrl: string): string {
	const trimmed = baseUrl.trim();

	if (!trimmed) {
		return API_ROUTES.websocket;
	}

  let url: URL;
  try {
    url = new URL(trimmed.replace(/^ws:/, 'http:').replace(/^wss:/, 'https:'));
  } catch {
    const fallback = trimmed.replace(/\/$/, '');
		if (fallback.endsWith(API_ROUTES.websocket)) {
			return fallback;
		}
		return fallback;
	}

	const normalizedPath = url.pathname.replace(/\/+$/, '');
	if (normalizedPath === '' || normalizedPath === '/') {
		url.pathname = API_ROUTES.websocket;
	}

	return `${url.origin}${url.pathname}`;
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
	const parsed = JSON.parse(raw) as SocketEnvelope;
	if (!parsed || typeof parsed !== 'object' || typeof parsed.type !== 'string') {
		throw new Error('Invalid websocket envelope');
	}
	return parsed;
}

export function safeParseSocketEnvelope(raw: string): SocketEnvelope | null {
	try {
		return parseSocketEnvelope(raw);
	} catch {
		return null;
	}
}
