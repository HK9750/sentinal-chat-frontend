'use client';

import { useEffect, useRef } from 'react';
import { refreshAccessToken } from '@/services/api-client';
import { useAuthStore } from '@/stores/auth-store';

export function AuthBootstrapProvider({ children }: { children: React.ReactNode }) {
  const markHydrated = useAuthStore((state) => state.markHydrated);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) {
      return;
    }

    startedRef.current = true;
    let active = true;

    async function bootstrapAuth() {
      try {
        await refreshAccessToken();
      } finally {
        if (active) {
          markHydrated();
        }
      }
    }

    void bootstrapAuth();

    return () => {
      active = false;
    };
  }, [markHydrated]);

  return <>{children}</>;
}
