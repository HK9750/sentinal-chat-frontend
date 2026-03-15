'use client';

import { EncryptionProvider } from '@/providers/encryption-provider';
import { SocketProvider } from '@/providers/socket-provider';
import { useAuthStore } from '@/stores/auth-store';

export function AuthenticatedProviders({ children }: { children: React.ReactNode }) {
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const isAuthenticated = useAuthStore((state) => state.status === 'authenticated');

  if (!isHydrated || !isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <EncryptionProvider>
      <SocketProvider>{children}</SocketProvider>
    </EncryptionProvider>
  );
}
