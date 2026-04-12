'use client';

import { CallController } from '@/components/shared/call-controller';
import { NotificationPanel } from '@/components/shared/notification-panel';
import { SocketProvider } from '@/providers/socket-provider';
import { useAuthStore } from '@/stores/auth-store';

export function AuthenticatedProviders({ children }: { children: React.ReactNode }) {
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const isAuthenticated = useAuthStore((state) => state.status === 'authenticated');

  if (!isHydrated || !isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <SocketProvider>
      <CallController />
      <NotificationPanel />
      {children}
    </SocketProvider>
  );
}
