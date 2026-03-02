'use client';

import { useCallback, useRef, useEffect } from 'react';
import { useCallStore } from '@/stores/call-store';
import { useSocket } from '@/providers/socket-provider';
import { useMarkCallConnected } from '@/queries/use-call-queries';

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

/**
 * useWebRTC manages the full RTCPeerConnection lifecycle for a 1:1 call.
 *
 * It handles:
 * - Creating the peer connection with ICE servers
 * - Generating SDP offers (caller) and answers (callee)
 * - Buffering ICE candidates that arrive before the remote description is set
 * - Attaching local media tracks
 * - Piping remote tracks into the call store
 * - Cleaning up on call end
 */
export function useWebRTC() {
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const iceCandidateBuffer = useRef<RTCIceCandidateInit[]>([]);
  const remoteDescriptionSet = useRef(false);

  const { sendCallOffer, sendCallAnswer, sendIceCandidate } = useSocket();
  const markConnected = useMarkCallConnected();

  const setRemoteStream = useCallStore((s) => s.setRemoteStream);
  const setPeerConnection = useCallStore((s) => s.setPeerConnection);
  const setActiveCall = useCallStore((s) => s.setActiveCall);

  /**
   * Create a new RTCPeerConnection and wire up event handlers.
   */
  const createPeerConnection = useCallback(
    (callId: string, remoteUserId: string): RTCPeerConnection => {
      // Close any existing connection
      if (pcRef.current) {
        pcRef.current.close();
      }

      remoteDescriptionSet.current = false;
      iceCandidateBuffer.current = [];

      const pc = new RTCPeerConnection(ICE_SERVERS);
      pcRef.current = pc;

      // Send ICE candidates to remote peer via WebSocket
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          sendIceCandidate(callId, remoteUserId, event.candidate);
        }
      };

      // Handle remote tracks arriving
      pc.ontrack = (event) => {
        const [stream] = event.streams;
        if (stream) {
          setRemoteStream(remoteUserId, stream);
        }
      };

      // Monitor ICE connection state
      pc.oniceconnectionstatechange = () => {
        const state = pc.iceConnectionState;
        if (state === 'connected' || state === 'completed') {
          // Mark the call as connected on the backend
          const activeCall = useCallStore.getState().activeCall;
          if (activeCall) {
            markConnected.mutate(activeCall.id);
            setActiveCall({ ...activeCall, status: 'ACTIVE' });
          }
        }
        if (state === 'failed' || state === 'disconnected' || state === 'closed') {
          setRemoteStream(remoteUserId, null);
        }
      };

      // Store in Zustand so other components can reference it
      setPeerConnection(remoteUserId, pc);

      return pc;
    },
    [sendIceCandidate, setRemoteStream, setPeerConnection, setActiveCall, markConnected]
  );

  /**
   * Attach local media tracks to the peer connection.
   */
  const addLocalTracks = useCallback((pc: RTCPeerConnection, stream: MediaStream) => {
    stream.getTracks().forEach((track) => {
      pc.addTrack(track, stream);
    });
  }, []);

  /**
   * Caller flow: create a peer connection, add local tracks, generate an SDP
   * offer, set it as local description, and send it via WebSocket.
   */
  const startCall = useCallback(
    async (callId: string, remoteUserId: string, localStream: MediaStream) => {
      const pc = createPeerConnection(callId, remoteUserId);
      addLocalTracks(pc, localStream);

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      sendCallOffer(callId, remoteUserId, offer);
    },
    [createPeerConnection, addLocalTracks, sendCallOffer]
  );

  /**
   * Callee flow: create a peer connection, add local tracks, set the remote
   * offer as remote description, generate an SDP answer, set it as local
   * description, flush any buffered ICE candidates, and send the answer
   * via WebSocket.
   */
  const answerCall = useCallback(
    async (callId: string, remoteUserId: string, localStream: MediaStream, offerSdp: string) => {
      const pc = createPeerConnection(callId, remoteUserId);
      addLocalTracks(pc, localStream);

      await pc.setRemoteDescription(
        new RTCSessionDescription({ type: 'offer', sdp: offerSdp })
      );
      remoteDescriptionSet.current = true;

      // Flush buffered ICE candidates
      for (const candidate of iceCandidateBuffer.current) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
      iceCandidateBuffer.current = [];

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      sendCallAnswer(callId, remoteUserId, answer);
    },
    [createPeerConnection, addLocalTracks, sendCallAnswer]
  );

  /**
   * Handle an incoming SDP answer (caller receives this after callee answers).
   */
  const handleRemoteAnswer = useCallback(async (sdp: string) => {
    const pc = pcRef.current;
    if (!pc) return;

    await pc.setRemoteDescription(
      new RTCSessionDescription({ type: 'answer', sdp })
    );
    remoteDescriptionSet.current = true;

    // Flush buffered ICE candidates
    for (const candidate of iceCandidateBuffer.current) {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    }
    iceCandidateBuffer.current = [];
  }, []);

  /**
   * Handle an incoming ICE candidate. If the remote description hasn't been
   * set yet, buffer it for later.
   */
  const handleRemoteICECandidate = useCallback(async (candidate: RTCIceCandidateInit) => {
    const pc = pcRef.current;
    if (!pc) return;

    if (remoteDescriptionSet.current) {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } else {
      iceCandidateBuffer.current.push(candidate);
    }
  }, []);

  /**
   * Tear down the peer connection and clean up all state.
   */
  const cleanup = useCallback(() => {
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    remoteDescriptionSet.current = false;
    iceCandidateBuffer.current = [];
  }, []);

  // Auto-cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    startCall,
    answerCall,
    handleRemoteAnswer,
    handleRemoteICECandidate,
    cleanup,
  };
}
