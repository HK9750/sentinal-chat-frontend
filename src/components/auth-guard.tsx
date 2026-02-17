'use client';

import { redirect } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { Spinner } from '@/components/shared/spinner';

/**
 * AuthGuard - Protects routes that require authentication
 * 
 * Since middleware handles the redirect for unauthenticated users,
 * this component only needs to handle the hydration state.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  // Show loading state while Zustand hydrates from localStorage
  if (!isHydrated) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950">
        <Spinner size="lg" />
      </div>
    );
  }

  // If not authenticated after hydration, show nothing
  // (middleware will redirect, this is just a fallback)
  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}

/**
 * GuestGuard - Protects routes that should only be accessible to guests
 * 
 * Middleware now handles redirect for authenticated users trying to access
 * auth pages, so this component just handles the hydration loading state.
 */
export function GuestGuard({ children }: { children: React.ReactNode }) {
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  // Show loading state while Zustand hydrates from localStorage
  if (!isHydrated) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950">
        <Spinner size="lg" />
      </div>
    );
  }

  // If authenticated after hydration, redirect to chat
  // Middleware should handle this, but this is a client-side fallback
  if (isAuthenticated) {
    redirect('/chat');
  }

  return <>{children}</>;
}
