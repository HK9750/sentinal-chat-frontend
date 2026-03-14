'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { AlertTriangle, ArrowLeftRight } from 'lucide-react';
import { Spinner } from '@/components/shared/spinner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { clearOAuthFlow, consumeOAuthFlow, readOAuthFlow } from '@/lib/oauth';
import { useOAuthExchangeMutation } from '@/queries/use-auth-queries';
import type { OAuthProvider } from '@/types';

function isOAuthProvider(value: string): value is OAuthProvider {
  return value === 'google' || value === 'github';
}

export default function OAuthCallbackPage() {
  const params = useParams<{ provider: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const exchangeMutation = useOAuthExchangeMutation();
  const [error, setError] = useState<string | null>(null);
  const attemptRef = useRef<string | null>(null);

  const provider = useMemo(() => {
    const raw = Array.isArray(params.provider) ? params.provider[0] : params.provider;
    return raw && isOAuthProvider(raw) ? raw : null;
  }, [params.provider]);

  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const providerError = searchParams.get('error');
  const providerErrorDescription = searchParams.get('error_description');
  const attemptKey = provider && code && state ? `${provider}:${code}:${state}` : null;

  useEffect(() => {
    let active = true;

    async function completeOAuth() {
      if (!provider) {
        setError('Unsupported OAuth provider.');
        return;
      }

      if (providerError) {
        setError(providerErrorDescription ?? 'The provider did not complete the sign-in flow.');
        return;
      }

      if (!code || !state) {
        setError('The OAuth callback is missing the required code or state values.');
        return;
      }

      if (attemptKey && attemptRef.current === attemptKey) {
        return;
      }

      const flow = readOAuthFlow(provider);

      if (!flow) {
        setError('This sign-in session expired. Start the OAuth flow again.');
        return;
      }

      if (flow.state !== state) {
        clearOAuthFlow(provider);
        setError('The OAuth state did not match. Please try again.');
        return;
      }

      if (attemptKey) {
        attemptRef.current = attemptKey;
      }

      const consumedFlow = consumeOAuthFlow(provider);

      if (!consumedFlow) {
        setError('This sign-in session has already been used. Start the OAuth flow again.');
        return;
      }

      try {
        await exchangeMutation.mutateAsync({
          provider,
          input: {
            code,
            code_verifier: consumedFlow.code_verifier,
            redirect_uri: consumedFlow.redirect_uri,
          },
        });

        if (active) {
          router.replace(consumedFlow.post_auth_redirect || '/chat');
        }
      } catch (exchangeError) {
        if (active) {
          setError(exchangeError instanceof Error ? exchangeError.message : 'Unable to complete OAuth sign-in.');
        }
      }
    }

    void completeOAuth();

    return () => {
      active = false;
    };
  }, [attemptKey, code, exchangeMutation, provider, providerError, providerErrorDescription, router, state]);

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="surface-panel w-full max-w-md border-border/60 shadow-[0_24px_80px_-32px_rgba(18,46,55,0.4)]">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2 text-xl tracking-[-0.04em]">
            {error ? <AlertTriangle className="size-5 text-destructive" /> : <ArrowLeftRight className="size-5 text-primary" />}
            {error ? 'OAuth could not finish' : 'Completing sign-in'}
          </CardTitle>
          <CardDescription>
            {error ? 'The provider callback did not finish cleanly.' : 'We are exchanging your provider code and restoring your secure session.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error ? (
            <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          ) : (
            <div className="flex items-center justify-center gap-3 rounded-xl border border-border/70 bg-background/60 px-4 py-5 text-sm text-muted-foreground">
              <Spinner size="sm" />
              Finalizing your account...
            </div>
          )}

          <div className="flex gap-2">
            <Button asChild variant="outline" className="flex-1">
              <Link href="/login">Back to login</Link>
            </Button>
            <Button asChild className="flex-1">
              <Link href="/chat">Go to chat</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
