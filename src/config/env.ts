export const env = {
  API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080',
  SOCKET_URL: process.env.NEXT_PUBLIC_SOCKET_URL || 'ws://localhost:8080',
};

export function validateEnv() {
  if (!env.API_URL) {
    throw new Error('NEXT_PUBLIC_API_URL is required');
  }
}
