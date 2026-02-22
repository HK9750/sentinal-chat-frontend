
const CLIENT_DEVICE_ID_KEY = 'sentinel_device_id';
const SERVER_DEVICE_UUID_KEY = 'sentinel_device_uuid';

export function getOrCreateClientDeviceId(): string {
  if (typeof window === 'undefined') return '';

  let deviceId = localStorage.getItem(CLIENT_DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem(CLIENT_DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
}

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

export function getDeviceType(): string {
  return 'web';
}

export function getDeviceInfo(): { id: string; name: string; type: string } {
  return {
    id: getOrCreateClientDeviceId(),
    name: getDeviceName(),
    type: getDeviceType(),
  };
}

export function setServerDeviceId(uuid: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SERVER_DEVICE_UUID_KEY, uuid);
}

export function getServerDeviceId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(SERVER_DEVICE_UUID_KEY);
}

export function clearServerDeviceId(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(SERVER_DEVICE_UUID_KEY);
}
