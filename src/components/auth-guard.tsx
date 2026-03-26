'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Spinner } from '@/components/shared/spinner';
import { useAuthStore } from '@/stores/auth-store';

function FullscreenLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Spinner size="lg" />
    </div>
  );
}

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const router = useRouter();
  const pathname = usePathname();
  const isRestoringSession = !isHydrated;

  useEffect(() => {
    if (isRestoringSession || isAuthenticated) {
      return;
    }

    const redirectTarget = pathname || '/chat';
    router.replace(`/login?redirect=${encodeURIComponent(redirectTarget)}`);
  }, [isAuthenticated, isRestoringSession, pathname, router]);

  if (isRestoringSession) {
    return <FullscreenLoader />;
  }

  if (!isAuthenticated) {
    return <FullscreenLoader />;
  }

  return <>{children}</>;
}

export function GuestGuard({ children }: { children: React.ReactNode }) {
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const router = useRouter();
  const isRestoringSession = !isHydrated;

  useEffect(() => {
    if (isRestoringSession || !isAuthenticated) {
      return;
    }

    router.replace('/chat');
  }, [isAuthenticated, isRestoringSession, router]);

  if (isRestoringSession) {
    return <FullscreenLoader />;
  }

  if (isAuthenticated) {
    return <FullscreenLoader />;
  }

  return <>{children}</>;
}
