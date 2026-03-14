'use client';

import { useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
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
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!isHydrated || isAuthenticated) {
      return;
    }

    const search = searchParams.toString();
    const redirectTarget = pathname ? `${pathname}${search ? `?${search}` : ''}` : '/chat';
    router.replace(`/login?redirect=${encodeURIComponent(redirectTarget)}`);
  }, [isAuthenticated, isHydrated, pathname, router, searchParams]);

  if (!isHydrated) {
    return <FullscreenLoader />;
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}

export function GuestGuard({ children }: { children: React.ReactNode }) {
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = searchParams.get('redirect');
  const redirectTo = redirectTarget && redirectTarget.startsWith('/') ? redirectTarget : '/chat';

  useEffect(() => {
    if (!isHydrated || !isAuthenticated) {
      return;
    }

    router.replace(redirectTo);
  }, [isAuthenticated, isHydrated, redirectTo, router]);

  if (!isHydrated) {
    return <FullscreenLoader />;
  }

  if (isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
