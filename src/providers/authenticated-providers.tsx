'use client';

import { CallController } from '@/components/shared/call-controller';
import { NotificationPanel } from '@/components/shared/notification-panel';
import { NotificationToastStack } from '@/components/shared/notification-toast-stack';
import { useNotificationSync } from '@/hooks/use-notification-sync';
import { SocketProvider } from '@/providers/socket-provider';
import { useAuthStore } from '@/stores/auth-store';

function NotificationSyncBridge() {
  useNotificationSync();
  return null;
}

export function AuthenticatedProviders({ children }: { children: React.ReactNode }) {
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const isAuthenticated = useAuthStore((state) => state.status === 'authenticated');

  if (!isHydrated || !isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <SocketProvider>
      <NotificationSyncBridge />
      <CallController />
      <NotificationPanel />
      <NotificationToastStack />
      {children}
    </SocketProvider>
  );
}
