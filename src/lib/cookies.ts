
export function setAuthCookie(token: string): void {
  if (typeof document === 'undefined') return;
  
  const expires = new Date();
  expires.setDate(expires.getDate() + 7);
  
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
