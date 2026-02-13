// Device fingerprinting for stable device identification
// Uses multiple browser characteristics to create a stable fingerprint

interface DeviceFingerprint {
  id: string;
  name: string;
  type: 'web';
}

function generateFingerprint(): string {
  if (typeof window === 'undefined') return '';
  
  const components = [
    navigator.userAgent,
    navigator.language,
    screen.colorDepth,
    screen.width + 'x' + screen.height,
    new Date().getTimezoneOffset(),
    !!window.sessionStorage,
    !!window.localStorage,
    navigator.hardwareConcurrency || '',
    (navigator as Navigator & { deviceMemory?: number }).deviceMemory || '',
  ];
  
  // Simple hash function
  const str = components.join('|');
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).substring(0, 16);
}

export function getDeviceFingerprint(): DeviceFingerprint {
  if (typeof window === 'undefined') {
    return { id: '', name: 'Unknown Device', type: 'web' };
  }
  
  // Check for stored fingerprint
  const stored = localStorage.getItem('device_fingerprint');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      // Invalid stored data, generate new
    }
  }
  
  // Generate new fingerprint
  const fingerprint: DeviceFingerprint = {
    id: generateFingerprint(),
    name: getDeviceName(),
    type: 'web',
  };
  
  // Store persistently
  localStorage.setItem('device_fingerprint', JSON.stringify(fingerprint));
  
  return fingerprint;
}

function getDeviceName(): string {
  if (typeof window === 'undefined') return 'Web Browser';
  
  const userAgent = navigator.userAgent;
  
  // Detect browser
  if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) {
    return 'Chrome';
  } else if (userAgent.includes('Firefox')) {
    return 'Firefox';
  } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
    return 'Safari';
  } else if (userAgent.includes('Edg')) {
    return 'Edge';
  }
  
  return 'Web Browser';
}

export function getDeviceId(): string {
  return getDeviceFingerprint().id;
}
