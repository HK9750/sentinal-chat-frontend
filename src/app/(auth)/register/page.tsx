'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { GuestGuard } from '@/components/auth-guard';
import { useRegister } from '@/queries/use-auth-queries';
import { Spinner } from '@/components/shared/spinner';

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

  return (
    <GuestGuard>
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary mb-4">
              <svg
                className="w-8 h-8 text-primary-foreground"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Sentinel Chat</h1>
            <p className="text-muted-foreground">Create your secure account</p>
          </div>

          <div className="bg-card border text-card-foreground shadow-sm rounded-2xl p-8">
            <h2 className="text-xl font-semibold mb-6 text-center">
              Create account
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMessage && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  {errorMessage}
                </div>
              )}

              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-foreground mb-2"
                >
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  className="w-full px-4 py-3 bg-background border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label
                  htmlFor="username"
                  className="block text-sm font-medium text-foreground mb-2"
                >
                  Username
                </label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  autoComplete="username"
                  className="w-full px-4 py-3 bg-background border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                  placeholder="Choose a username"
                />
              </div>

              <div>
                <label
                  htmlFor="display_name"
                  className="block text-sm font-medium text-foreground mb-2"
                >
                  Display Name <span className="text-muted-foreground text-xs">(optional)</span>
                </label>
                <input
                  id="display_name"
                  name="display_name"
                  type="text"
                  autoComplete="name"
                  className="w-full px-4 py-3 bg-background border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                  placeholder="How you want to be called"
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-foreground mb-2"
                >
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className="w-full px-4 py-3 bg-background border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                  placeholder="Create a strong password"
                />
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-medium text-foreground mb-2"
                >
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className="w-full px-4 py-3 bg-background border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                  placeholder="Confirm your password"
                />
              </div>

              <button
                type="submit"
                disabled={registerMutation.isPending}
                className="w-full py-3 px-4 bg-primary text-primary-foreground hover:bg-primary/90 font-medium rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-6"
              >
                {registerMutation.isPending ? (
                  <>
                    <Spinner size="sm" className="border-primary-foreground/30 border-t-primary-foreground" />
                    Creating account...
                  </>
                ) : (
                  'Create account'
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-muted-foreground text-sm">
                Already have an account?{' '}
                <Link
                  href="/login"
                  className="text-primary hover:underline font-medium transition-colors"
                >
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </GuestGuard>
  );
}
