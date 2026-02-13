export const env = {
  API_URL: process.env.NEXT_PUBLIC_API_URL,
  SOCKET_URL: process.env.NEXT_PUBLIC_SOCKET_URL,
};

export function validateEnv() {
  if (!env.API_URL) {
    throw new Error('NEXT_PUBLIC_API_URL is required');
  }
}
