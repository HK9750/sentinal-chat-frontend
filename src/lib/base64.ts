const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

function encodeBinary(binary: string): string {
  if (typeof btoa === 'function') {
    return btoa(binary);
  }

  return Buffer.from(binary, 'binary').toString('base64');
}

function decodeBinary(base64: string): string {
  if (typeof atob === 'function') {
    return atob(base64);
  }

  return Buffer.from(base64, 'base64').toString('binary');
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return encodeBinary(binary);
}

export function base64ToBytes(base64: string): Uint8Array {
  const binary = decodeBinary(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

export function stringToBase64(value: string): string {
  return bytesToBase64(textEncoder.encode(value));
}

export function base64ToString(value: string): string {
  return textDecoder.decode(base64ToBytes(value));
}

export function jsonToBase64<T>(value: T): string {
  return stringToBase64(JSON.stringify(value));
}

export function base64ToJson<T>(value: string): T {
  return JSON.parse(base64ToString(value)) as T;
}
