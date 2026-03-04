'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { useGenerateKeys, useEncryptionStatus, useReplenishPreKeys } from '@/hooks/use-encryption';

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 2000;
const REPLENISH_INTERVAL_MS = 5 * 60 * 1000;

export function EncryptionProvider({ children }: { children: React.ReactNode }) {
    const { user, isAuthenticated } = useAuthStore();
    const { isSetup, isLoading: statusLoading } = useEncryptionStatus();
    const replenishPreKeys = useReplenishPreKeys();

    const replenishTimer = useRef<NodeJS.Timeout | null>(null);
    const isReplenishing = useRef(false);

    // Encryption setup (generating keys) requires a password, so it's handled 
    // natively during login or registration flow, not here in the provider.
    // However, if the user gets here and is NOT setup, we might prompt them
    // via a UI modal (out of scope for provider).

    useEffect(() => {
        if (!isAuthenticated || !user || !isSetup) return;

        const replenish = async () => {
            if (isReplenishing.current) return;
            isReplenishing.current = true;
            try {
                await replenishPreKeys.mutateAsync();
            } catch {
            } finally {
                isReplenishing.current = false;
            }
        };

        replenish();

        replenishTimer.current = setInterval(replenish, REPLENISH_INTERVAL_MS);

        return () => {
            if (replenishTimer.current) {
                clearInterval(replenishTimer.current);
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAuthenticated, user, isSetup]); // Removed replenishPreKeys dependency to prevent loop on reference change

    useEffect(() => {
        if (!isAuthenticated) {
            // Reset any provider-level auth state if needed
        }
    }, [isAuthenticated]);

    return <>{children}</>;
}
