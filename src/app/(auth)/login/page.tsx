'use client';

import { Suspense, useCallback, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { GuestGuard } from '@/components/auth-guard';
import { useLogin } from '@/queries/use-auth-queries';
import { useRecoverKeys } from '@/hooks/use-encryption';
import { Spinner } from '@/components/shared/spinner';
import Link from 'next/link';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { PasswordInput } from '@/components/ui/password-input';
import { ShieldCheck, LogIn } from 'lucide-react';

function LoginForm() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/chat';
  const loginMutation = useLogin();
  const recoverKeysMutation = useRecoverKeys();
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setRecoveryError(null);

      const formData = new FormData(e.currentTarget);
      const identity = formData.get('identity') as string;
      const password = formData.get('password') as string;

      if (!identity || !password) return;

      try {
        const response = await loginMutation.mutateAsync({ identity, password });
        if (response.success) {
          try {
            setIsRecovering(true);
            await recoverKeysMutation.mutateAsync(password);
            window.location.href = redirectTo;
          } catch (recoveryErr) {
            console.warn('Key recovery failed on login:', recoveryErr);
            window.location.href = redirectTo;
          } finally {
            setIsRecovering(false);
          }
        }
      } catch {
        // Error is captured by loginMutation.error
      }
    },
    [loginMutation, recoverKeysMutation, redirectTo]
  );

  const errorMessage =
    loginMutation.error?.message ||
    (loginMutation.data && !loginMutation.data.success
      ? loginMutation.data.error
      : null) ||
    recoveryError;

  const isLoading = loginMutation.isPending || isRecovering;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 sm:p-8">
      {/* Subtle gradient background orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md space-y-8">
        {/* Branding */}
        <div className="flex flex-col items-center space-y-3 text-center">
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/25">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Sentinel Chat
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              End-to-end encrypted messaging
            </p>
          </div>
        </div>

        {/* Login Card */}
        <Card className="border-border/40 shadow-xl">
          <CardHeader className="pb-4 text-center">
            <CardTitle className="text-xl font-semibold">Welcome back</CardTitle>
            <CardDescription>
              Enter your credentials to sign in
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              {errorMessage && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium animate-in fade-in slide-in-from-top-1 duration-200">
                  <svg
                    className="size-4 shrink-0"
                    viewBox="0 0 16 16"
                    fill="currentColor"
                  >
                    <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1ZM7.25 5a.75.75 0 0 1 1.5 0v3a.75.75 0 0 1-1.5 0V5ZM8 11.5A.75.75 0 1 1 8 10a.75.75 0 0 1 0 1.5Z" />
                  </svg>
                  {errorMessage}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="identity">Email or Username</Label>
                <Input
                  id="identity"
                  name="identity"
                  type="text"
                  required
                  autoComplete="email"
                  placeholder="name@example.com"
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <PasswordInput
                  id="password"
                  name="password"
                  required
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  className="h-11"
                />
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                size="lg"
                className="w-full mt-2 shadow-md shadow-primary/20 transition-all active:scale-[0.98]"
              >
                {isLoading ? (
                  <>
                    <Spinner
                      size="sm"
                      className="border-primary-foreground/30 border-t-primary-foreground"
                    />
                    {isRecovering ? 'Restoring keys...' : 'Signing in...'}
                  </>
                ) : (
                  <>
                    <LogIn className="size-4" />
                    Sign in
                  </>
                )}
              </Button>
            </form>
          </CardContent>

          <CardFooter className="justify-center pb-6">
            <p className="text-sm text-muted-foreground">
              Don&apos;t have an account?{' '}
              <Link
                href="/register"
                className="text-primary font-semibold hover:underline transition-colors"
              >
                Create one
              </Link>
            </p>
          </CardFooter>
        </Card>

        {/* Footer badge */}
        <p className="text-center text-xs text-muted-foreground/60">
          Protected by end-to-end encryption
        </p>
      </div>
    </div>
  );
}

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
