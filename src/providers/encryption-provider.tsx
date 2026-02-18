'use client';

/**
 * Background Encryption Provider
 *
 * Automatically sets up E2EE keys when the user is authenticated.
 * Handles retry with exponential backoff and periodically replenishes one-time pre-keys.
 * No UI — runs entirely in the background.
 */

import { useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { useGenerateKeys, useEncryptionStatus, useReplenishPreKeys } from '@/hooks/use-encryption';

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 2000;
const REPLENISH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

export function EncryptionProvider({ children }: { children: React.ReactNode }) {
    const { user, isAuthenticated } = useAuthStore();
    const { isSetup, isLoading: statusLoading } = useEncryptionStatus();
    const generateKeys = useGenerateKeys();
    const replenishPreKeys = useReplenishPreKeys();

    const retryCount = useRef(0);
    const setupAttempted = useRef(false);
    const replenishTimer = useRef<NodeJS.Timeout | null>(null);

    // Background key generation with exponential backoff
    const attemptSetup = useCallback(async () => {
        console.log('[Encryption] attemptSetup called', {
            retryCount: retryCount.current,
            maxRetries: MAX_RETRIES,
        });

        if (retryCount.current >= MAX_RETRIES) {
            console.error('[Encryption] Max retries reached. Encryption setup failed permanently.');
            return;
        }

        try {
            console.log('[Encryption] Calling generateKeys.mutateAsync()...');
            const result = await generateKeys.mutateAsync();
            console.log('[Encryption] Setup complete', result);
            retryCount.current = 0;
        } catch (error) {
            retryCount.current += 1;
            const delay = BASE_DELAY_MS * Math.pow(2, retryCount.current - 1);
            console.error(
                `[Encryption] Setup FAILED (attempt ${retryCount.current}/${MAX_RETRIES}), retrying in ${delay}ms`,
                {
                    errorMessage: error instanceof Error ? error.message : String(error),
                    errorStack: error instanceof Error ? error.stack : undefined,
                    error,
                }
            );
            setTimeout(attemptSetup, delay);
        }
    }, [generateKeys]);

    // Auto-setup on mount when user is authenticated and encryption is not set up
    useEffect(() => {
        console.log('[Encryption] Provider effect evaluated', {
            isAuthenticated,
            hasUser: !!user,
            userId: user?.id,
            statusLoading,
            isSetup,
            setupAttempted: setupAttempted.current,
        });

        if (!isAuthenticated || !user || statusLoading) {
            console.log('[Encryption] Skipping setup — not ready', {
                reason: !isAuthenticated ? 'not authenticated' : !user ? 'no user' : 'status loading',
            });
            return;
        }
        if (isSetup || setupAttempted.current) {
            console.log('[Encryption] Skipping setup — already done', {
                isSetup,
                setupAttempted: setupAttempted.current,
            });
            return;
        }

        console.log('[Encryption] Triggering background key setup for user:', user.id);
        setupAttempted.current = true;
        attemptSetup();
    }, [isAuthenticated, user, isSetup, statusLoading, attemptSetup]);

    // Periodic pre-key replenishment
    useEffect(() => {
        if (!isAuthenticated || !user || !isSetup) {
            console.log('[Encryption] Pre-key replenishment skipped — not ready', {
                isAuthenticated,
                hasUser: !!user,
                isSetup,
            });
            return;
        }

        const replenish = async () => {
            try {
                console.log('[Encryption] Checking pre-key count...');
                const result = await replenishPreKeys.mutateAsync();
                if (result.replenished) {
                    console.log(`[Encryption] Replenished ${result.count} one-time pre-keys`);
                } else {
                    console.log('[Encryption] Pre-key count sufficient, no replenishment needed');
                }
            } catch (error) {
                console.error('[Encryption] Pre-key replenishment failed:', {
                    errorMessage: error instanceof Error ? error.message : String(error),
                    error,
                });
            }
        };

        // Initial check
        replenish();

        // Schedule periodic checks
        replenishTimer.current = setInterval(replenish, REPLENISH_INTERVAL_MS);

        return () => {
            if (replenishTimer.current) {
                clearInterval(replenishTimer.current);
            }
        };
    }, [isAuthenticated, user, isSetup, replenishPreKeys]);

    // Reset state on logout
    useEffect(() => {
        if (!isAuthenticated) {
            setupAttempted.current = false;
            retryCount.current = 0;
        }
    }, [isAuthenticated]);

    return <>{children}</>;
}
