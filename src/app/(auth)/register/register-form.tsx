'use client';

import { useCallback, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { UserPlus } from 'lucide-react';
import { Spinner } from '@/components/shared/spinner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/ui/password-input';
import { registerSchema } from '@/lib/validators';
import { useRegister } from '@/queries/use-auth-queries';
import type { RegisterRequest } from '@/types';
import { AuthShell } from '../auth-shell';
import { OAuthButtonRow } from '../oauth-button-row';

function getFallbackDisplayName(values: {
  display_name: string;
  username?: string;
  email?: string;
}) {
  if (values.display_name) {
    return values.display_name;
  }

  if (values.username) {
    return values.username;
  }

  if (values.email) {
    return values.email.split('@')[0] ?? 'Sentinel User';
  }

  return 'Sentinel User';
}

function buildRegisterPayload(values: {
  display_name: string;
  email?: string;
  username?: string;
  phone_number?: string;
  password: string;
}): Omit<RegisterRequest, 'device'> {
  return {
    display_name: getFallbackDisplayName(values),
    password: values.password,
    ...(values.email ? { email: values.email } : {}),
    ...(values.username ? { username: values.username } : {}),
    ...(values.phone_number ? { phone_number: values.phone_number } : {}),
  };
}

export function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const registerMutation = useRegister();
  const [formError, setFormError] = useState<string | null>(null);
  const redirectTarget = searchParams.get('redirect');
  const redirectTo = redirectTarget && redirectTarget.startsWith('/') ? redirectTarget : '/chat';

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setFormError(null);

      const formData = new FormData(event.currentTarget);
      const parsed = registerSchema.safeParse({
        display_name: formData.get('display_name'),
        email: formData.get('email'),
        username: formData.get('username'),
        phone_number: '',
        password: formData.get('password'),
        confirm_password: formData.get('confirm_password'),
      });

      if (!parsed.success) {
        setFormError(parsed.error.issues[0]?.message ?? 'Check the form and try again.');
        return;
      }

      try {
        await registerMutation.mutateAsync(buildRegisterPayload(parsed.data));
        router.replace(redirectTo);
      } catch {
        setFormError('We could not create your account right now. Try again in a moment.');
      }
    },
    [redirectTo, registerMutation, router]
  );

  const errorMessage = formError ?? registerMutation.error?.message ?? null;

  return (
    <AuthShell
      title="Create your account"
      description="Start with a local-first identity and jump into messaging, file sharing, and voice notes."
      cardTitle="Join Sentinel"
      cardDescription="Create an account with at least one unique identifier."
      footerText="Already have an account?"
      footerHref={redirectTo === '/chat' ? '/login' : `/login?redirect=${encodeURIComponent(redirectTo)}`}
      footerLabel="Sign in"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMessage ? (
          <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {errorMessage}
          </div>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
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
            autoComplete="username"
            placeholder="pick-a-handle"
            className="h-11"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="display_name">Display name</Label>
          <Input
            id="display_name"
            name="display_name"
            type="text"
            autoComplete="name"
            placeholder="What people see in chat"
            className="h-11"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <PasswordInput
              id="password"
              name="password"
              autoComplete="new-password"
              placeholder="Min. 8 characters"
              className="h-11"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm_password">Confirm password</Label>
            <PasswordInput
              id="confirm_password"
              name="confirm_password"
              autoComplete="new-password"
              placeholder="Repeat password"
              className="h-11"
              required
            />
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Use an email or username. Display name is optional and can be changed later once the settings screens are rewritten.
        </p>

        <Button type="submit" className="h-11 w-full" disabled={registerMutation.isPending}>
          {registerMutation.isPending ? (
            <>
              <Spinner size="sm" className="border-primary-foreground/30 border-t-primary-foreground" />
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

      <OAuthButtonRow postAuthRedirect={redirectTo} />
    </AuthShell>
  );
}
