const ACCESS_TOKEN_COOKIE = 'access_token';

export function setAuthCookie(token: string, expiresAt?: string): void {
  if (typeof document === 'undefined') {
    return;
  }

  const expires = expiresAt ? new Date(expiresAt) : new Date(Date.now() + 15 * 60 * 60 * 1000);
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';

  document.cookie = `${ACCESS_TOKEN_COOKIE}=${encodeURIComponent(token)}; expires=${expires.toUTCString()}; path=/; SameSite=Lax${secure}`;
}

export function clearAuthCookie(): void {
  if (typeof document === 'undefined') {
    return;
  }

  document.cookie = `${ACCESS_TOKEN_COOKIE}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`;
}

export function getAuthCookie(): string | null {
  if (typeof document === 'undefined') {
    return null;
  }

  const match = document.cookie.match(new RegExp(`${ACCESS_TOKEN_COOKIE}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}
