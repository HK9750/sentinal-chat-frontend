'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { GuestGuard } from '@/components/auth-guard';
import { useRegister } from '@/queries/use-auth-queries';
import { Spinner } from '@/components/shared/spinner';
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
import { ShieldCheck, UserPlus } from 'lucide-react';

export default function RegisterPage() {
  const registerMutation = useRegister();
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setValidationError(null);

      const formData = new FormData(e.currentTarget);
      const email = formData.get('email') as string;
      const username = formData.get('username') as string;
      const displayName = formData.get('display_name') as string;
      const password = formData.get('password') as string;
      const confirmPassword = formData.get('confirmPassword') as string;

      if (password !== confirmPassword) {
        setValidationError('Passwords do not match');
        return;
      }

      if (password.length < 8) {
        setValidationError('Password must be at least 8 characters');
        return;
      }

      try {
        const response = await registerMutation.mutateAsync({
          email,
          username,
          display_name: displayName || username,
          password,
        });

        if (response.success) {
          window.location.href = '/chat';
        }
      } catch {
        // Error is captured by registerMutation.error
      }
    },
    [registerMutation]
  );

  const errorMessage =
    validationError ||
    registerMutation.error?.message ||
    (registerMutation.data && !registerMutation.data.success
      ? registerMutation.data.error
      : null);

  const isPending = registerMutation.isPending;

  return (
    <GuestGuard>
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
                Create your secure account
              </p>
            </div>
          </div>

          {/* Register Card */}
          <Card className="border-border/40 shadow-xl">
            <CardHeader className="pb-4 text-center">
              <CardTitle className="text-xl font-semibold">
                Create account
              </CardTitle>
              <CardDescription>
                Join Sentinel Chat today
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
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
                  <Label htmlFor="email">Email address</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="you@example.com"
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    name="username"
                    type="text"
                    required
                    autoComplete="username"
                    placeholder="Choose a username"
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="display_name">
                    Display Name{' '}
                    <span className="text-muted-foreground font-normal">
                      (optional)
                    </span>
                  </Label>
                  <Input
                    id="display_name"
                    name="display_name"
                    type="text"
                    autoComplete="name"
                    placeholder="How you want to be called"
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <PasswordInput
                    id="password"
                    name="password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    placeholder="Min. 8 characters"
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <PasswordInput
                    id="confirmPassword"
                    name="confirmPassword"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    placeholder="Re-enter your password"
                    className="h-11"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isPending}
                  size="lg"
                  className="w-full mt-2 shadow-md shadow-primary/20 transition-all active:scale-[0.98]"
                >
                  {isPending ? (
                    <>
                      <Spinner
                        size="sm"
                        className="border-primary-foreground/30 border-t-primary-foreground"
                      />
                      Creating account...
                    </>
                  ) : (
                    <>
                      <UserPlus className="size-4" />
                      Create account
                    </>
                  )}
                </Button>
              </form>
            </CardContent>

            <CardFooter className="justify-center pb-6">
              <p className="text-sm text-muted-foreground">
                Already have an account?{' '}
                <Link
                  href="/login"
                  className="text-primary font-semibold hover:underline transition-colors"
                >
                  Sign in
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
    </GuestGuard>
  );
}
