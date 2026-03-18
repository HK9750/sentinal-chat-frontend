'use client';

import { useCallback } from 'react';
import { DEFAULT_RTC_CONFIGURATION } from '@/services/call-service';
import { useCallStore } from '@/stores/call-store';

export function useWebRtc() {
  const setPeerConnection = useCallStore((state) => state.setPeerConnection);
  const setStreams = useCallStore((state) => state.setStreams);
  const peerConnection = useCallStore((state) => state.peerConnection);

  const createPeerConnection = useCallback(async () => {
    const connection = new RTCPeerConnection(DEFAULT_RTC_CONFIGURATION);
    const remoteStream = new MediaStream();

    connection.ontrack = (event) => {
      for (const track of event.streams[0]?.getTracks() ?? []) {
        remoteStream.addTrack(track);
      }
      setStreams(useCallStore.getState().localStream, remoteStream);
    };

    setPeerConnection(connection);
    return connection;
  }, [setPeerConnection, setStreams]);

  const ensureLocalStream = useCallback(async (mode: 'audio' | 'video') => {
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: mode === 'video',
      });
    } catch (error) {
      if (mode !== 'video') {
        throw error;
      }

      stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });
    }

    setStreams(stream, useCallStore.getState().remoteStream);

    return stream;
  }, [setStreams]);

  const attachLocalTracks = useCallback(async (connection: RTCPeerConnection, stream: MediaStream) => {
    stream.getTracks().forEach((track) => {
      connection.addTrack(track, stream);
    });
  }, []);

  return {
    peerConnection,
    createPeerConnection,
    ensureLocalStream,
    attachLocalTracks,
  };
}
