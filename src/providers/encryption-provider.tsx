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
    const generateKeys = useGenerateKeys();
    const replenishPreKeys = useReplenishPreKeys();

    const retryCount = useRef(0);
    const setupAttempted = useRef(false);
    const replenishTimer = useRef<NodeJS.Timeout | null>(null);

    const attemptSetup = useCallback(async () => {
        if (retryCount.current >= MAX_RETRIES) return;

        try {
            await generateKeys.mutateAsync();
            retryCount.current = 0;
        } catch {
            retryCount.current += 1;
            const delay = BASE_DELAY_MS * Math.pow(2, retryCount.current - 1);
            setTimeout(attemptSetup, delay);
        }
    }, [generateKeys]);

    useEffect(() => {
        if (!isAuthenticated || !user || statusLoading) return;
        if (isSetup || setupAttempted.current) return;

        setupAttempted.current = true;
        attemptSetup();
    }, [isAuthenticated, user, isSetup, statusLoading, attemptSetup]);

    useEffect(() => {
        if (!isAuthenticated || !user || !isSetup) return;

        const replenish = async () => {
            try {
                await replenishPreKeys.mutateAsync();
            } catch {
            }
        };

        replenish();

        replenishTimer.current = setInterval(replenish, REPLENISH_INTERVAL_MS);

        return () => {
            if (replenishTimer.current) {
                clearInterval(replenishTimer.current);
            }
        };
    }, [isAuthenticated, user, isSetup, replenishPreKeys]);

    useEffect(() => {
        if (!isAuthenticated) {
            setupAttempted.current = false;
            retryCount.current = 0;
        }
    }, [isAuthenticated]);

    return <>{children}</>;
}
