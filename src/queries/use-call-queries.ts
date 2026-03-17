'use client';

import { useMemo } from 'react';
import { DEFAULT_RTC_CONFIGURATION } from '@/services/call-service';
import { APP_LIMITATIONS } from '@/lib/constants';

export function useRtcConfiguration() {
  return useMemo(() => DEFAULT_RTC_CONFIGURATION, []);
}

export function useCallLimitations() {
  return useMemo(
    () => [
      'Direct chats use WebRTC peer-to-peer media with websocket signaling.',
      APP_LIMITATIONS.calls,
      'TURN is not configured in the current environment, so some networks may fail to connect.',
    ],
    []
  );
}
