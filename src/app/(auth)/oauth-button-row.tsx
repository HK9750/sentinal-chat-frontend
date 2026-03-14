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
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.2-.9 2.2-1.9 2.9l3 2.4c1.8-1.6 2.8-4 2.8-6.9 0-.7-.1-1.5-.2-2.2H12Z" />
      <path fill="#34A853" d="M6.6 14.3l-.7.5-2.4 1.9A9.9 9.9 0 0 0 12 22c2.7 0 4.9-.9 6.6-2.5l-3-2.4c-.8.6-2 1-3.6 1a6 6 0 0 1-5.7-4.1Z" />
      <path fill="#4A90E2" d="M3.5 7.3A10 10 0 0 0 3 10c0 1 .2 2 .5 2.8.1 0 3.1-2.4 3.1-2.4A6 6 0 0 1 12 6c1.7 0 3.1.6 4 1.5l2.9-2.9A9.9 9.9 0 0 0 12 2a9.9 9.9 0 0 0-8.5 5.3Z" />
      <path fill="#FBBC05" d="M6.3 9.6A5.9 5.9 0 0 1 12 6c1.7 0 3.1.6 4 1.5l2.9-2.9A9.9 9.9 0 0 0 3.5 7.3l2.8 2.3Z" />
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
