'use client';

import { useCallback, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { LogIn } from 'lucide-react';
import { Spinner } from '@/components/shared/spinner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/ui/password-input';
import { loginSchema } from '@/lib/validators';
import { useLogin } from '@/queries/use-auth-queries';
import { AuthShell } from '../auth-shell';
import { OAuthButtonRow } from '../oauth-button-row';

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const loginMutation = useLogin();
  const [formError, setFormError] = useState<string | null>(null);
  const redirectTarget = searchParams.get('redirect');
  const redirectTo = redirectTarget && redirectTarget.startsWith('/') ? redirectTarget : '/chat';

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setFormError(null);

      const formData = new FormData(event.currentTarget);
      const parsed = loginSchema.safeParse({
        identifier: formData.get('identifier'),
        password: formData.get('password'),
      });

      if (!parsed.success) {
        setFormError(parsed.error.issues[0]?.message ?? 'Check your credentials and try again.');
        return;
      }

      try {
        await loginMutation.mutateAsync(parsed.data);
        router.replace(redirectTo);
      } catch {
        setFormError('We could not sign you in. Check your credentials and try again.');
      }
    },
    [loginMutation, redirectTo, router]
  );

  const errorMessage = formError ?? loginMutation.error?.message ?? null;

  return (
    <AuthShell
      title="Sentinel Chat"
      description="Sign in to your secure workspace and decrypt your conversations locally."
      cardTitle="Welcome back"
      cardDescription="Use your email, username, or phone number to continue."
      footerText="Need an account?"
      footerHref="/register"
      footerLabel="Create one"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {errorMessage ? (
          <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {errorMessage}
          </div>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="identifier">Email, username, or phone</Label>
          <Input
            id="identifier"
            name="identifier"
            type="text"
            autoComplete="username"
            placeholder="you@example.com"
            className="h-11"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <PasswordInput
            id="password"
            name="password"
            autoComplete="current-password"
            placeholder="Enter your password"
            className="h-11"
            required
          />
        </div>

        <Button type="submit" className="h-11 w-full" disabled={loginMutation.isPending}>
          {loginMutation.isPending ? (
            <>
              <Spinner size="sm" className="border-primary-foreground/30 border-t-primary-foreground" />
              Signing in...
            </>
          ) : (
            <>
              <LogIn className="size-4" />
              Sign in
            </>
          )}
        </Button>
      </form>

      <OAuthButtonRow postAuthRedirect={redirectTo} />
    </AuthShell>
  );
}
