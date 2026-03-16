'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { clearConversationDecryptedCache, readDecryptedMessage, writeDecryptedMessage } from '@/lib/decrypted-message-cache';
import { CONVERSATION_KEYS_UPDATED_EVENT } from '@/lib/crypto-storage';
import { useEncryption } from '@/hooks/use-encryption';
import { useMessages } from '@/queries/use-message-queries';
import type { DecryptedMessageState, Message } from '@/types';

interface DecryptedMessageEntry {
  message: Message;
  decrypted: DecryptedMessageState;
}

function getFallbackState(message: Message): DecryptedMessageState {
  if (message.deleted_at) {
    return {
      status: 'ready',
      payload: {
        kind: 'system',
        text: 'This message was removed.',
      },
    };
  }

  if (!message.encrypted_content) {
    return { status: 'empty' };
  }

  return {
    status: 'empty',
  };
}

export function useDecryptedMessages(conversationId?: string | null) {
  const messagesQuery = useMessages(conversationId);
  const { decryptForConversation } = useEncryption();
  const [states, setStates] = useState<Record<string, DecryptedMessageState>>({});
  const inflightRef = useRef(new Set<string>());

  useEffect(() => {
    setStates({});
    inflightRef.current.clear();
  }, [conversationId]);

  useEffect(() => {
    let cancelled = false;

    async function hydrateMessages() {
      if (!conversationId || !messagesQuery.data) {
        return;
      }

      for (const message of messagesQuery.data) {
        const cacheKey = `${message.id}:${message.encrypted_content ?? 'empty'}`;

        if (states[cacheKey]) {
          continue;
        }

        const cached = readDecryptedMessage(message.id, message.encrypted_content);
        if (cached) {
          if (!cancelled) {
            setStates((current) => ({
              ...current,
              [cacheKey]: cached,
            }));
          }
          continue;
        }

        if (inflightRef.current.has(cacheKey)) {
          continue;
        }

        inflightRef.current.add(cacheKey);

        try {
          const decrypted = await decryptForConversation(conversationId, message);
          writeDecryptedMessage(message.id, message.encrypted_content, decrypted);

          if (!cancelled) {
            setStates((current) => ({
              ...current,
              [cacheKey]: decrypted,
            }));
          }
        } finally {
          inflightRef.current.delete(cacheKey);
        }
      }
    }

    void hydrateMessages();

    return () => {
      cancelled = true;
    };
  }, [conversationId, decryptForConversation, messagesQuery.data, states]);

  useEffect(() => {
    if (!conversationId || typeof window === 'undefined') {
      return;
    }

    const handleKeysUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ action?: string; conversationId?: string }>).detail;

      if (detail?.action !== 'cleared' && detail?.conversationId && detail.conversationId !== conversationId) {
        return;
      }

      clearConversationDecryptedCache((messagesQuery.data ?? []).map((message) => message.id));
      inflightRef.current.clear();
      setStates({});
      void messagesQuery.refetch();
    };

    window.addEventListener(CONVERSATION_KEYS_UPDATED_EVENT, handleKeysUpdated as EventListener);

    return () => {
      window.removeEventListener(CONVERSATION_KEYS_UPDATED_EVENT, handleKeysUpdated as EventListener);
    };
  }, [conversationId, messagesQuery]);

  const items = useMemo<DecryptedMessageEntry[]>(() => {
    return (messagesQuery.data ?? []).map((message) => {
      const cacheKey = `${message.id}:${message.encrypted_content ?? 'empty'}`;

      return {
        message,
        decrypted: states[cacheKey] ?? readDecryptedMessage(message.id, message.encrypted_content) ?? getFallbackState(message),
      };
    });
  }, [messagesQuery.data, states]);

  return {
    ...messagesQuery,
    items,
  };
}
