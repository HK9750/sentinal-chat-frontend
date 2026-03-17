"use client";

import type { OAuthProvider } from "@/types";

const OAUTH_STORAGE_PREFIX = "sentinel.oauth";
const OAUTH_FLOW_TTL_MS = 15 * 60 * 1000;
const encoder = new TextEncoder();

interface StoredOAuthFlow {
  provider: OAuthProvider;
  code_verifier: string;
  state: string;
  redirect_uri: string;
  post_auth_redirect: string;
  created_at?: number;
}

function toBase64Url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function getStorageKey(provider: OAuthProvider): string {
  return `${OAUTH_STORAGE_PREFIX}.${provider}`;
}

function readStorageValue(storage: Storage, key: string): string | null {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorageValue(storage: Storage, key: string, value: string): void {
  try {
    storage.setItem(key, value);
  } catch {
    return;
  }
}

function removeStorageValue(storage: Storage, key: string): void {
  try {
    storage.removeItem(key);
  } catch {
    return;
  }
}

function isOAuthFlowExpired(flow: StoredOAuthFlow): boolean {
  return !flow.created_at || Date.now() - flow.created_at > OAUTH_FLOW_TTL_MS;
}

function parseStoredOAuthFlow(
  provider: OAuthProvider,
  rawValue: string | null,
): StoredOAuthFlow | null {
  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as StoredOAuthFlow;

    if (
      parsed.provider !== provider ||
      !parsed.created_at ||
      isOAuthFlowExpired(parsed)
    ) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function assertBrowser(): void {
  if (typeof window === "undefined") {
    throw new Error("OAuth must be started in the browser.");
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
  const digest = await crypto.subtle.digest(
    "SHA-256",
    encoder.encode(verifier),
  );
  return toBase64Url(new Uint8Array(digest));
}

export function saveOAuthFlow(flow: StoredOAuthFlow): void {
  assertBrowser();

  const payload = JSON.stringify({
    ...flow,
    created_at: Date.now(),
  });

  writeStorageValue(
    window.sessionStorage,
    getStorageKey(flow.provider),
    payload,
  );
  writeStorageValue(window.localStorage, getStorageKey(flow.provider), payload);
}

export function readOAuthFlow(provider: OAuthProvider): StoredOAuthFlow | null {
  assertBrowser();

  const key = getStorageKey(provider);
  const fromSession = parseStoredOAuthFlow(
    provider,
    readStorageValue(window.sessionStorage, key),
  );

  if (fromSession) {
    return fromSession;
  }

  const fromLocal = parseStoredOAuthFlow(
    provider,
    readStorageValue(window.localStorage, key),
  );

  if (fromLocal) {
    writeStorageValue(window.sessionStorage, key, JSON.stringify(fromLocal));
    return fromLocal;
  }

  clearOAuthFlow(provider);
  return null;
}

export function clearOAuthFlow(provider: OAuthProvider): void {
  assertBrowser();
  const key = getStorageKey(provider);
  removeStorageValue(window.sessionStorage, key);
  removeStorageValue(window.localStorage, key);
}

export function consumeOAuthFlow(
  provider: OAuthProvider,
): StoredOAuthFlow | null {
  const flow = readOAuthFlow(provider);

  if (!flow) {
    return null;
  }

  clearOAuthFlow(provider);
  return flow;
}
