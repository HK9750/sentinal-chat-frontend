import { z } from 'zod';

const envSchema = z.object({
  NEXT_PUBLIC_API_URL: z.url('NEXT_PUBLIC_API_URL must be a valid URL.'),
  NEXT_PUBLIC_SOCKET_URL: z.url('NEXT_PUBLIC_SOCKET_URL must be a valid URL.'),
  // WebRTC TURN server configuration (optional - falls back to STUN only)
  NEXT_PUBLIC_TURN_URL: z.string().optional(),
  NEXT_PUBLIC_TURN_USERNAME: z.string().optional(),
  NEXT_PUBLIC_TURN_CREDENTIAL: z.string().optional(),
  // Call configuration
  NEXT_PUBLIC_CALL_TIMEOUT_MS: z.string().optional(),
  NEXT_PUBLIC_ICE_GATHERING_TIMEOUT_MS: z.string().optional(),
});

function resolveEnv() {
  const parsed = envSchema.parse({
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_SOCKET_URL: process.env.NEXT_PUBLIC_SOCKET_URL,
    NEXT_PUBLIC_TURN_URL: process.env.NEXT_PUBLIC_TURN_URL,
    NEXT_PUBLIC_TURN_USERNAME: process.env.NEXT_PUBLIC_TURN_USERNAME,
    NEXT_PUBLIC_TURN_CREDENTIAL: process.env.NEXT_PUBLIC_TURN_CREDENTIAL,
    NEXT_PUBLIC_CALL_TIMEOUT_MS: process.env.NEXT_PUBLIC_CALL_TIMEOUT_MS,
    NEXT_PUBLIC_ICE_GATHERING_TIMEOUT_MS: process.env.NEXT_PUBLIC_ICE_GATHERING_TIMEOUT_MS,
  });

  return {
    apiUrl: parsed.NEXT_PUBLIC_API_URL.replace(/\/$/, ''),
    socketUrl: parsed.NEXT_PUBLIC_SOCKET_URL.replace(/\/$/, ''),
    // TURN server config
    turnUrl: parsed.NEXT_PUBLIC_TURN_URL,
    turnUsername: parsed.NEXT_PUBLIC_TURN_USERNAME,
    turnCredential: parsed.NEXT_PUBLIC_TURN_CREDENTIAL,
    // Call timeouts
    callTimeoutMs: parseInt(parsed.NEXT_PUBLIC_CALL_TIMEOUT_MS || '30000', 10),
    iceGatheringTimeoutMs: parseInt(parsed.NEXT_PUBLIC_ICE_GATHERING_TIMEOUT_MS || '5000', 10),
  };
}

export const env = resolveEnv();
