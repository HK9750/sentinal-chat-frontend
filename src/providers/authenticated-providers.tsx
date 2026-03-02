'use client';

import { useAuthStore } from '@/stores/auth-store';
import { SocketProvider } from '@/providers/socket-provider';
import { EncryptionProvider } from '@/providers/encryption-provider';
import { IncomingCallDialog } from '@/components/shared/incoming-call-dialog';
import { ActiveCallOverlay } from '@/components/shared/active-call-overlay';

/**
 * Wraps children with Socket + Encryption providers only when the
 * user is authenticated and the Zustand store has hydrated from
 * localStorage.  On unauthenticated pages (login, register) none
 * of these providers mount, avoiding wasted WebSocket connections
 * and IndexedDB reads.
 */
export function AuthenticatedProviders({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isHydrated = useAuthStore((s) => s.isHydrated);

  // Before hydration we don't know auth state yet — just render children.
  // After hydration, wrap with Socket + Encryption only when authenticated.
  if (!isHydrated || !isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <SocketProvider>
      <EncryptionProvider>
        {children}
        <IncomingCallDialog />
        <ActiveCallOverlay />
      </EncryptionProvider>
    </SocketProvider>
  );
}
