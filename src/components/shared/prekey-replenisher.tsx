'use client';

import { useEffect, useRef } from 'react';
import { useReplenishPreKeys, useEncryptionStatus } from '@/hooks/use-encryption';

const CHECK_INTERVAL_MS = 5 * 60 * 1000;

export function PreKeyReplenisher() {
  const { isSetup, isLoading } = useEncryptionStatus();
  const replenishMutation = useReplenishPreKeys();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasCheckedRef = useRef(false);

  useEffect(() => {
    if (!isSetup || isLoading) return;

    if (!hasCheckedRef.current) {
      hasCheckedRef.current = true;
      replenishMutation.mutate();
    }

    intervalRef.current = setInterval(() => {
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

  return null;
}
