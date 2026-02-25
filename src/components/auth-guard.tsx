'use client';

import { useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { Spinner } from '@/components/shared/spinner';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!isHydrated) return;
    if (!isAuthenticated) {
      const search = searchParams?.toString();
      const redirectTarget = pathname ? `${pathname}${search ? `?${search}` : ''}` : '/chat';
      const redirectUrl = `/login?redirect=${encodeURIComponent(redirectTarget)}`;
      router.replace(redirectUrl);
    }
  }, [isHydrated, isAuthenticated, pathname, router, searchParams]);

  if (!isHydrated) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950">
        <Spinner size="lg" />
      </div>
    );
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
  const redirectParam = searchParams?.get('redirect');
  const redirectTo = redirectParam && redirectParam.startsWith('/') ? redirectParam : '/chat';

  useEffect(() => {
    if (!isHydrated) return;
    if (isAuthenticated) {
      router.replace(redirectTo);
    }
  }, [isHydrated, isAuthenticated, redirectTo, router]);

  if (!isHydrated) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
