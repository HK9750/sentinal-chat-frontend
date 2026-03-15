'use client';

import { Suspense } from 'react';
import { GuestGuard } from '@/components/auth-guard';
import { Spinner } from '@/components/shared/spinner';
import { RegisterForm } from './register-form';

export default function RegisterPage() {
  return (
    <GuestGuard>
      <Suspense
        fallback={
          <div className="flex min-h-screen items-center justify-center bg-background">
            <Spinner size="lg" />
          </div>
        }
      >
        <RegisterForm />
      </Suspense>
    </GuestGuard>
  );
}
