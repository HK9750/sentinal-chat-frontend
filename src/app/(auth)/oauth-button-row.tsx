'use client';

import { useCallback, useState } from 'react';
import { Github } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { clearOAuthFlow, createCodeChallenge, createCodeVerifier, createOAuthState, resolveOAuthRedirectUri, saveOAuthFlow } from '@/lib/oauth';
import { useOAuthAuthorizeMutation } from '@/queries/use-auth-queries';
import type { OAuthProvider } from '@/types';

interface OAuthButtonRowProps {
  postAuthRedirect: string;
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
      <path
        fill="currentColor"
        d="M21.8 12.2c0-.7-.1-1.4-.2-2H12v3.9h5.5a4.9 4.9 0 0 1-2.1 3.2c-1 .7-2.2 1.1-3.4 1.1A6.1 6.1 0 0 1 6 12a6.1 6.1 0 0 1 6-6c1.7 0 3.2.6 4.3 1.6l2.8-2.8A10 10 0 0 0 12 2a10 10 0 1 0 9.8 10.2Z"
      />
    </svg>
  );
}

export function OAuthButtonRow({ postAuthRedirect }: OAuthButtonRowProps) {
  const oauthAuthorizeMutation = useOAuthAuthorizeMutation();
  const [activeProvider, setActiveProvider] = useState<OAuthProvider | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleProviderClick = useCallback(
    async (provider: OAuthProvider) => {
      setError(null);
      setActiveProvider(provider);
      clearOAuthFlow(provider);

      try {
        const redirectUri = resolveOAuthRedirectUri(provider);
        const codeVerifier = createCodeVerifier();
        const codeChallenge = await createCodeChallenge(codeVerifier);
        const state = createOAuthState(provider);
        const payload = await oauthAuthorizeMutation.mutateAsync({
          provider,
          input: {
            redirect_uri: redirectUri,
            code_challenge: codeChallenge,
            state,
          },
        });

        saveOAuthFlow({
          provider,
          code_verifier: codeVerifier,
          state,
          redirect_uri: payload.redirect_uri,
          post_auth_redirect: postAuthRedirect,
        });

        window.location.assign(payload.authorization_url);
      } catch (providerError) {
        setError(providerError instanceof Error ? providerError.message : 'Unable to start OAuth right now.');
        setActiveProvider(null);
      }
    },
    [oauthAuthorizeMutation, postAuthRedirect]
  );

  const isPending = oauthAuthorizeMutation.isPending;

  return (
    <div className="space-y-3">
      <div className="relative py-1">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border/70" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-card px-3 text-[11px] font-mono uppercase tracking-[0.22em] text-muted-foreground">
            Or continue with
          </span>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <Button
          type="button"
          variant="outline"
          className="h-11 justify-center rounded-xl"
          disabled={isPending}
          onClick={() => handleProviderClick('google')}
        >
          <GoogleIcon />
          {activeProvider === 'google' && isPending ? 'Redirecting...' : 'Google'}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-11 justify-center rounded-xl"
          disabled={isPending}
          onClick={() => handleProviderClick('github')}
        >
          <Github className="size-4" />
          {activeProvider === 'github' && isPending ? 'Redirecting...' : 'GitHub'}
        </Button>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
