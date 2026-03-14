'use client';

import type { OAuthProvider } from '@/types';

const OAUTH_STORAGE_PREFIX = 'sentinel.oauth';
const encoder = new TextEncoder();

interface StoredOAuthFlow {
  provider: OAuthProvider;
  code_verifier: string;
  state: string;
  redirect_uri: string;
  post_auth_redirect: string;
}

function toBase64Url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function getStorageKey(provider: OAuthProvider): string {
  return `${OAUTH_STORAGE_PREFIX}.${provider}`;
}

function assertBrowser(): void {
  if (typeof window === 'undefined') {
    throw new Error('OAuth must be started in the browser.');
  }
}

export function resolveOAuthRedirectUri(provider: OAuthProvider): string {
  assertBrowser();
  return `${window.location.origin}/auth/callback/${provider}`;
}

export function createOAuthState(provider: OAuthProvider): string {
  return `${provider}_${crypto.randomUUID()}`;
}

export function createCodeVerifier(length = 64): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return toBase64Url(bytes).slice(0, length);
}

export async function createCodeChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(verifier));
  return toBase64Url(new Uint8Array(digest));
}

export function saveOAuthFlow(flow: StoredOAuthFlow): void {
  assertBrowser();
  window.sessionStorage.setItem(getStorageKey(flow.provider), JSON.stringify(flow));
}

export function readOAuthFlow(provider: OAuthProvider): StoredOAuthFlow | null {
  assertBrowser();
  const value = window.sessionStorage.getItem(getStorageKey(provider));

  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as StoredOAuthFlow;
  } catch {
    window.sessionStorage.removeItem(getStorageKey(provider));
    return null;
  }
}

export function clearOAuthFlow(provider: OAuthProvider): void {
  assertBrowser();
  window.sessionStorage.removeItem(getStorageKey(provider));
}
