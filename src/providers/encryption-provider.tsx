'use client';

import { createContext, useContext, useMemo } from 'react';
import { getCryptoVaultState, listConversationKeys } from '@/lib/crypto-storage';
import type { ConversationKeyRecord, CryptoVaultState } from '@/types';

interface EncryptionContextValue {
  vault: CryptoVaultState;
  keys: ConversationKeyRecord[];
}

const EncryptionContext = createContext<EncryptionContextValue | null>(null);

export function EncryptionProvider({ children }: { children: React.ReactNode }) {
  const value = useMemo(
    () => ({
      vault: getCryptoVaultState(),
      keys: listConversationKeys(),
    }),
    []
  );

  return <EncryptionContext.Provider value={value}>{children}</EncryptionContext.Provider>;
}

export function useEncryptionContext() {
  const context = useContext(EncryptionContext);

  if (!context) {
    throw new Error('useEncryptionContext must be used within EncryptionProvider.');
  }

  return context;
}
