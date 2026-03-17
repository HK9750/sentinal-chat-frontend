'use client';

import { useCallback, useEffect, useRef } from 'react';
import { SOCKET_EVENT, TYPING_DEBOUNCE_DELAY } from '@/lib/constants';
import { createRequestId } from '@/lib/request-id';
import { useSocket } from '@/providers/socket-provider';
import { useChatStore } from '@/stores/chat-store';

export function useTypingChannel(conversationId?: string | null) {
  const socket = useSocket();
  const pruneTyping = useChatStore((state) => state.pruneTyping);
  const debounceTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => {
      pruneTyping();
    }, 1000);

    return () => window.clearInterval(timer);
  }, [pruneTyping]);

  const sendTyping = useCallback(
    (active: boolean) => {
      if (!conversationId) {
        return;
      }

      socket.send({
        type: active ? SOCKET_EVENT.typingStart : SOCKET_EVENT.typingStop,
        request_id: createRequestId('typing'),
        conversation_id: conversationId,
      });
    },
    [conversationId, socket]
  );

  const debouncedSendTyping = useCallback(
    (active: boolean) => {
      if (debounceTimerRef.current) {
        window.clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = window.setTimeout(() => {
        sendTyping(active);
      }, TYPING_DEBOUNCE_DELAY);
    },
    [sendTyping]
  );

  useEffect(
    () => () => {
      if (debounceTimerRef.current) {
        window.clearTimeout(debounceTimerRef.current);
      }
    },
    []
  );

  return {
    sendTyping: debouncedSendTyping,
  };
}
