'use client';

import { useCallback, useRef } from 'react';

const SINE_FREQUENCY = 880;
const DURATION_SECONDS = 0.09;

export function useNotificationSound() {
  const lastPlayedAtRef = useRef(0);

  const play = useCallback((enabled: boolean) => {
    if (!enabled || typeof window === 'undefined') {
      return;
    }
    const now = Date.now();
    if (now - lastPlayedAtRef.current < 300) {
      return;
    }
    lastPlayedAtRef.current = now;

    try {
      const AudioContextClass =
        window.AudioContext ||
        (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) {
        return;
      }

      const context = new AudioContextClass();
      const oscillator = context.createOscillator();
      const gainNode = context.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.value = SINE_FREQUENCY;

      gainNode.gain.value = 0.0001;
      gainNode.gain.exponentialRampToValueAtTime(0.08, context.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + DURATION_SECONDS);

      oscillator.connect(gainNode);
      gainNode.connect(context.destination);

      oscillator.start();
      oscillator.stop(context.currentTime + DURATION_SECONDS);

      window.setTimeout(() => {
        void context.close();
      }, Math.ceil(DURATION_SECONDS * 1000) + 30);
    } catch {
      // Ignore non-critical audio API errors.
    }
  }, []);

  return { play };
}
