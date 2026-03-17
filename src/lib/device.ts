import { STORAGE_KEYS } from "@/lib/constants";
import type { ClientDeviceInput } from "@/types";

export function getOrCreateClientDeviceId(): string {
  if (typeof window === "undefined") {
    return "server-render";
  }

  const existing = window.localStorage.getItem(STORAGE_KEYS.deviceId);

  if (existing) {
    return existing;
  }

  const nextId = crypto.randomUUID();
  window.localStorage.setItem(STORAGE_KEYS.deviceId, nextId);
  return nextId;
}

export function getDeviceName(): string {
  if (typeof navigator === "undefined") {
    return "Server Render";
  }

  const userAgent = navigator.userAgent;
  const browser = userAgent.includes("Firefox")
    ? "Firefox"
    : userAgent.includes("Edg")
      ? "Edge"
      : userAgent.includes("Chrome")
        ? "Chrome"
        : userAgent.includes("Safari")
          ? "Safari"
          : "Browser";

  const platform = userAgent.includes("Windows")
    ? "Windows"
    : userAgent.includes("Mac OS X")
      ? "macOS"
      : userAgent.includes("Android")
        ? "Android"
        : userAgent.includes("iPhone") || userAgent.includes("iPad")
          ? "iOS"
          : "Linux";

  return `${browser} on ${platform}`;
}

export function getDeviceType(): string {
  return "web";
}

export function getClientDeviceInput(): ClientDeviceInput {
  return {
    device_id: getOrCreateClientDeviceId(),
    device_name: getDeviceName(),
    device_type: getDeviceType(),
  };
}

export function setServerDeviceId(deviceId: string): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEYS.serverDeviceId, deviceId);
}

export function getServerDeviceId(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(STORAGE_KEYS.serverDeviceId);
}

export function clearDeviceState(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(STORAGE_KEYS.serverDeviceId);
}
