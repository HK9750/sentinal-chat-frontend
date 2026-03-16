import { z } from 'zod';

const envSchema = z.object({
  NEXT_PUBLIC_API_URL: z.url('NEXT_PUBLIC_API_URL must be a valid URL.'),
  NEXT_PUBLIC_SOCKET_URL: z.url('NEXT_PUBLIC_SOCKET_URL must be a valid URL.'),
});

function resolveEnv() {
  const parsed = envSchema.parse({
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_SOCKET_URL: process.env.NEXT_PUBLIC_SOCKET_URL,
  });

  return {
    apiUrl: parsed.NEXT_PUBLIC_API_URL.replace(/\/$/, ''),
    socketUrl: parsed.NEXT_PUBLIC_SOCKET_URL.replace(/\/$/, ''),
  };
}

export const env = resolveEnv();
