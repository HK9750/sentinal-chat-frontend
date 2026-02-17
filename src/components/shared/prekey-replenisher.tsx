'use client';

import { useEffect, useRef } from 'react';
import { useReplenishPreKeys, useEncryptionStatus } from '@/hooks/use-encryption';

// Check prekeys every 5 minutes when connected
const CHECK_INTERVAL_MS = 5 * 60 * 1000;

/**
 * Background component that automatically replenishes one-time prekeys
 * when the count falls below the minimum threshold.
 *
 * Include this in your app layout to ensure prekeys are always available.
 */
export function PreKeyReplenisher() {
  const { isSetup, isLoading } = useEncryptionStatus();
  const replenishMutation = useReplenishPreKeys();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasCheckedRef = useRef(false);

  useEffect(() => {
    // Only run if encryption is set up
    if (!isSetup || isLoading) return;

    // Check immediately on mount (but only once)
    if (!hasCheckedRef.current) {
      hasCheckedRef.current = true;
      replenishMutation.mutate();
    }

    // Set up periodic checks
    intervalRef.current = setInterval(() => {
      // Don't start a new check if one is already in progress
      if (!replenishMutation.isPending) {
        replenishMutation.mutate();
      }
    }, CHECK_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isSetup, isLoading, replenishMutation]);

  // This component doesn't render anything
  return null;
}
