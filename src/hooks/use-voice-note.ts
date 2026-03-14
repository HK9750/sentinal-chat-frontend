'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { VOICE_NOTE_MIME_TYPES } from '@/lib/constants';
import type { VoiceRecordingResult } from '@/types';

function resolveMimeType(): string {
  const supported = VOICE_NOTE_MIME_TYPES.find((mimeType) => MediaRecorder.isTypeSupported(mimeType));
  return supported ?? 'audio/webm';
}

export function useVoiceNote() {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const startedAtRef = useRef<number | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  const mimeType = useMemo(() => resolveMimeType(), []);

  const startRecording = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream, { mimeType });
    chunksRef.current = [];
    startedAtRef.current = Date.now();

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunksRef.current.push(event.data);
      }
    };

    recorder.start();
    mediaRecorderRef.current = recorder;
    setIsRecording(true);
  }, [mimeType]);

  const stopRecording = useCallback(() => {
    return new Promise<VoiceRecordingResult>((resolve, reject) => {
      const recorder = mediaRecorderRef.current;

      if (!recorder) {
        reject(new Error('No recording is in progress.'));
        return;
      }

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        recorder.stream.getTracks().forEach((track) => track.stop());
        mediaRecorderRef.current = null;
        setIsRecording(false);
        resolve({
          blob,
          duration_ms: Math.max(0, Date.now() - (startedAtRef.current ?? Date.now())),
          mime_type: mimeType,
        });
      };

      recorder.stop();
    });
  }, [mimeType]);

  const cancelRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;

    if (!recorder) {
      return;
    }

    recorder.stream.getTracks().forEach((track) => track.stop());
    recorder.stop();
    mediaRecorderRef.current = null;
    chunksRef.current = [];
    setIsRecording(false);
  }, []);

  return {
    isRecording,
    mimeType,
    startRecording,
    stopRecording,
    cancelRecording,
  };
}
