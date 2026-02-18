/**
 * Device identification module.
 *
 * Uses a stable UUID stored in localStorage as the client-side device identifier.
 * The server assigns its own UUID (devices.ID PK) which is returned after login/register
 * and stored separately for use in encryption API calls.
 */

const CLIENT_DEVICE_ID_KEY = 'sentinel_device_id';
const SERVER_DEVICE_UUID_KEY = 'sentinel_device_uuid';

/**
 * Get or create a stable client-side device ID (UUID v4).
 * Persists across sessions in localStorage.
 * Does NOT clear on logout — same browser = same device.
 */
export function getOrCreateClientDeviceId(): string {
  if (typeof window === 'undefined') return '';

  let deviceId = localStorage.getItem(CLIENT_DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem(CLIENT_DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
}

/**
 * Get a human-readable device name from the user agent.
 * Used for display in the "Active Sessions" UI.
 */
export function getDeviceName(): string {
  if (typeof window === 'undefined') return 'Web Browser';

  const ua = navigator.userAgent;
  let browser = 'Web Browser';

  if (ua.includes('Edg')) {
    browser = 'Edge';
  } else if (ua.includes('Chrome') && !ua.includes('Edg')) {
    browser = 'Chrome';
  } else if (ua.includes('Firefox')) {
    browser = 'Firefox';
  } else if (ua.includes('Safari') && !ua.includes('Chrome')) {
    browser = 'Safari';
  }

  let os = '';
  if (ua.includes('Linux')) os = 'Linux';
  else if (ua.includes('Mac')) os = 'macOS';
  else if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

  return os ? `${browser} on ${os}` : browser;
}

/** Always 'web' for browser clients. */
export function getDeviceType(): string {
  return 'web';
}

/**
 * Get all device info needed for login/register requests.
 */
export function getDeviceInfo(): { id: string; name: string; type: string } {
  return {
    id: getOrCreateClientDeviceId(),
    name: getDeviceName(),
    type: getDeviceType(),
  };
}

// ---------------------------------------------------------------------------
// Server-assigned device UUID (devices.ID primary key)
// Set after successful login/register, used by encryption API calls.
// ---------------------------------------------------------------------------

/**
 * Store the server-assigned device UUID (devices.ID PK).
 * Called after successful login/register with `response.device_id`.
 */
export function setServerDeviceId(uuid: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SERVER_DEVICE_UUID_KEY, uuid);
}

/**
 * Retrieve the server-assigned device UUID.
 * Returns null if user hasn't logged in yet on this device.
 */
export function getServerDeviceId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(SERVER_DEVICE_UUID_KEY);
}

/**
 * Clear the server-assigned device UUID (on logout).
 * Keeps `sentinel_device_id` since the physical device hasn't changed.
 */
export function clearServerDeviceId(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(SERVER_DEVICE_UUID_KEY);
}
