'use client';

import { useEffect } from 'react';
import { useSocket } from '@/providers/socket-provider';
import type { SocketEnvelope } from '@/types';

export function useSocketEvents(onEvent: (envelope: SocketEnvelope) => void) {
  const socket = useSocket();

  useEffect(() => socket.subscribe(onEvent), [onEvent, socket]);
}
