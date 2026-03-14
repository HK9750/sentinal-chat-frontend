'use client';

import { Suspense } from 'react';
import { GuestGuard } from '@/components/auth-guard';
import { Spinner } from '@/components/shared/spinner';
import { LoginForm } from './login-form';

export default function LoginPage() {
  return (
    <GuestGuard>
      <Suspense
        fallback={
          <div className="min-h-screen bg-background flex items-center justify-center">
            <Spinner size="lg" />
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </GuestGuard>
  );
}
