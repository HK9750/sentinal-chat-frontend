const AUTH_COOKIE_NAME = "access_token";

function canUseDocument(): boolean {
  return typeof document !== "undefined";
}

function shouldUseSecureCookies(): boolean {
  return typeof window !== "undefined" && window.location.protocol === "https:";
}

export function setAuthCookie(token: string, expiresAt?: string): void {
  if (!canUseDocument() || !token.trim()) {
    return;
  }

  const segments = [
    `${AUTH_COOKIE_NAME}=${encodeURIComponent(token)}`,
    "Path=/",
    "SameSite=Lax",
  ];

  if (expiresAt) {
    const expiry = new Date(expiresAt);

    if (!Number.isNaN(expiry.getTime())) {
      segments.push(`Expires=${expiry.toUTCString()}`);
    }
  }

  if (shouldUseSecureCookies()) {
    segments.push("Secure");
  }

  document.cookie = segments.join("; ");
}

export function clearAuthCookie(): void {
  if (!canUseDocument()) {
    return;
  }

  const segments = [
    `${AUTH_COOKIE_NAME}=`,
    "Path=/",
    "Max-Age=0",
    "SameSite=Lax",
  ];

  if (shouldUseSecureCookies()) {
    segments.push("Secure");
  }

  document.cookie = segments.join("; ");
}

export function getAuthCookie(): string | null {
  if (!canUseDocument()) {
    return null;
  }

  const cookies = document.cookie.split("; ");

  for (const cookie of cookies) {
    if (!cookie.startsWith(`${AUTH_COOKIE_NAME}=`)) {
      continue;
    }

    const value = cookie.slice(`${AUTH_COOKIE_NAME}=`.length);
    return value ? decodeURIComponent(value) : null;
  }

  return null;
}
