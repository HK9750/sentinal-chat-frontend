'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { CONVERSATION_KEYS_UPDATED_EVENT, getCryptoVaultState, listConversationKeys } from '@/lib/crypto-storage';
import type { ConversationKeyRecord, CryptoVaultState } from '@/types';

interface EncryptionContextValue {
  vault: CryptoVaultState;
  keys: ConversationKeyRecord[];
}

const EncryptionContext = createContext<EncryptionContextValue | null>(null);

export function EncryptionProvider({ children }: { children: React.ReactNode }) {
  const [snapshot, setSnapshot] = useState(() => ({
    vault: getCryptoVaultState(),
    keys: listConversationKeys(),
  }));

  useEffect(() => {
    const handleKeysUpdated = () => {
      setSnapshot({
        vault: getCryptoVaultState(),
        keys: listConversationKeys(),
      });
    };

    window.addEventListener(CONVERSATION_KEYS_UPDATED_EVENT, handleKeysUpdated);

    return () => {
      window.removeEventListener(CONVERSATION_KEYS_UPDATED_EVENT, handleKeysUpdated);
    };
  }, []);

  const value = useMemo(
    () => ({
      vault: snapshot.vault,
      keys: snapshot.keys,
    }),
    [snapshot.keys, snapshot.vault]
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
