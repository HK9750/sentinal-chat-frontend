// Cookie utilities for auth token management
// Enables server-side auth checking via middleware

export function setAuthCookie(token: string): void {
  if (typeof document === 'undefined') return;
  
  // Set cookie with HttpOnly would be better, but we need client-side access
  // In production, use httpOnly cookies set by the backend
  const expires = new Date();
  expires.setDate(expires.getDate() + 7); // 7 days
  
  document.cookie = `access_token=${token}; expires=${expires.toUTCString()}; path=/; SameSite=Strict`;
}

export function clearAuthCookie(): void {
  if (typeof document === 'undefined') return;
  document.cookie = 'access_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
}

export function getAuthCookie(): string | null {
  if (typeof document === 'undefined') return null;
  
  const match = document.cookie.match(/access_token=([^;]+)/);
  return match ? match[1] : null;
}
