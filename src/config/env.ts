import { z } from 'zod';

/**
 * Environment variable schema with runtime validation
 * 
 * Per AGENTS.md: Validate environment variables at build time
 * to catch configuration errors early.
 */
const envSchema = z.object({
  // API URL for backend requests
  API_URL: z.string({ message: 'NEXT_PUBLIC_API_URL must be set' }).url('NEXT_PUBLIC_API_URL must be a valid URL'),

  // WebSocket URL for real-time communication
  SOCKET_URL: z.string({ message: 'NEXT_PUBLIC_SOCKET_URL must be set' }).url('NEXT_PUBLIC_SOCKET_URL must be a valid URL'),
});

type Env = z.infer<typeof envSchema>;

/**
 * Parse and validate environment variables
 */
function parseEnv(): Env {
  const result = envSchema.safeParse({
    API_URL: process.env.NEXT_PUBLIC_API_URL,
    SOCKET_URL: process.env.NEXT_PUBLIC_SOCKET_URL,
  });

  if (!result.success) {
    const errors = result.error.flatten().fieldErrors;
    const errorMessages = Object.entries(errors)
      .map(([key, messages]) => `  ${key}: ${messages?.join(', ')}`)
      .join('\n');

    console.error('Environment validation failed:\n', errorMessages);

    // In development, throw to fail fast
    // In production, the build should have caught this
    if (process.env.NODE_ENV === 'development') {
      throw new Error(`Invalid environment variables:\n${errorMessages}`);
    }
  }

  return result.data as Env;
}

export const env = parseEnv();
