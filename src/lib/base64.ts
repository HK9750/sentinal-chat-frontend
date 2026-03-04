/**
 * UTF-8 safe base64 encode/decode utilities.
 *
 * The native `btoa()` / `atob()` functions only handle Latin1 characters
 * (code points 0–255). They throw `InvalidCharacterError` on any multi-byte
 * UTF-8 character such as emoji (😀), accented characters (é), or CJK scripts.
 *
 * These helpers first encode the string to UTF-8 bytes via TextEncoder,
 * then base64-encode the raw bytes. This is compatible with Go's
 * `encoding/base64.StdEncoding` on the backend, which operates on raw bytes.
 */

/**
 * Encode a UTF-8 string to a base64 string.
 * Safe for emoji and all Unicode code points.
 */
export function utf8ToBase64(str: string): string {
    const bytes = new TextEncoder().encode(str);
    // Convert Uint8Array to a binary string that btoa can handle
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

/**
 * Decode a base64 string back to a UTF-8 string.
 * Safe for emoji and all Unicode code points.
 */
export function base64ToUtf8(base64: string): string {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder().decode(bytes);
}
