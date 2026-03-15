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

  useEffect(() => {
    if (!isHydrated || isAuthenticated) {
      return;
    }

    const redirectTarget = pathname || '/chat';
    router.replace(`/login?redirect=${encodeURIComponent(redirectTarget)}`);
  }, [isAuthenticated, isHydrated, pathname, router]);

  if (!isHydrated) {
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

  useEffect(() => {
    if (!isHydrated || !isAuthenticated) {
      return;
    }

    router.replace('/chat');
  }, [isAuthenticated, isHydrated, router]);

  if (!isHydrated) {
    return <FullscreenLoader />;
  }

  if (isAuthenticated) {
    return <FullscreenLoader />;
  }

  return <>{children}</>;
}
