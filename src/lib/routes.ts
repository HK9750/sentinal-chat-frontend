export function isSafeRedirectPath(value: string | null | undefined): value is string {
  if (!value) {
    return false;
  }

  if (!value.startsWith('/')) {
    return false;
  }

  if (value.startsWith('//')) {
    return false;
  }

  return true;
}

export function resolveRedirectPath(value: string | null | undefined, fallback = '/chat'): string {
  return isSafeRedirectPath(value) ? value : fallback;
}
