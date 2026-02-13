'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuthStore } from '@/stores/auth-store';

// AuthGuard ensures user is authenticated before showing content
// Redirect is handled by middleware, this just prevents UI flash
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  // Wait for hydration before rendering
  if (!isHydrated) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-3 border-slate-200 border-t-slate-900 mx-auto"></div>
        </div>
      </div>
    );
  }

  // If not authenticated, middleware will redirect, show nothing
  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}

// GuestGuard for login/register pages
// Ensures logged-in users don't see auth pages
export function GuestGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  useEffect(() => {
    // Only redirect after hydration to avoid hydration mismatch
    if (isHydrated && isAuthenticated) {
      router.replace('/');
    }
  }, [isHydrated, isAuthenticated, router]);

  // Wait for hydration
  if (!isHydrated) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-3 border-slate-200 border-t-slate-900 mx-auto"></div>
        </div>
      </div>
    );
  }

  // If authenticated, return null while redirecting
  if (isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
