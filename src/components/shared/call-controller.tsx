'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { ActiveCallOverlay } from '@/components/shared/active-call-overlay';
import { IncomingCallDialog } from '@/components/shared/incoming-call-dialog';
import { useCallSignaling } from '@/hooks/use-call-signaling';
import { useWebRtc } from '@/hooks/use-webrtc';
import { useCallStore } from '@/stores/call-store';
import { useAuthStore } from '@/stores/auth-store';
import { CallError } from '@/services/call-service';
import type { ActiveCall } from '@/types';
import type { PendingCallSignal } from '@/stores/call-store';

type SignalPayload = {
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
  ice_restart?: boolean;
};

function getPeerUserId(call: ActiveCall, currentUserId?: string | null): string | null {
  return (
    call.peer_user_id ??
    call.participant_ids?.find((participantId: string) => participantId !== currentUserId) ??
    null
  );
}

export function CallController() {
  const currentUserId = useAuthStore((state) => state.user?.id);
  const activeCall = useCallStore((state) => state.activeCall);
  const pendingSignals = useCallStore((state) => state.pendingSignals);
  const peerConnection = useCallStore((state) => state.peerConnection);
  const localStream = useCallStore((state) => state.localStream);
  const removeSignal = useCallStore((state) => state.removeSignal);
  const setCallStatus = useCallStore((state) => state.setCallStatus);
  const updateActiveCall = useCallStore((state) => state.updateActiveCall);
  const setLastQualityMetrics = useCallStore((state) => state.setLastQualityMetrics);
  const setReconnecting = useCallStore((state) => state.setReconnecting);
  const signalingErrorHandledRef = useRef<string | null>(null);

  const handleConnectionLost = useCallback(() => {
    setReconnecting(true);
  }, [setReconnecting]);

  const handleConnectionRestored = useCallback(() => {
    setReconnecting(false);
  }, [setReconnecting]);

  const handleWebRtcError = useCallback(
    (error: CallError) => {
      console.error('[CallController] WebRTC error:', error.code, error.message);
      if (!error.recoverable) {
        setCallStatus('failed', error.message);
      }
    },
    [setCallStatus]
  );

  const handleSignalingError = useCallback(
    (error: CallError) => {
      const callId = useCallStore.getState().activeCall?.call_id;
      if (callId && signalingErrorHandledRef.current === callId) {
        return;
      }

      if (callId) {
        signalingErrorHandledRef.current = callId;
      }

      console.error('[CallController] Signaling error:', error.code, error.message);
      setCallStatus('failed', error.message);
    },
    [setCallStatus]
  );

  const signalingOptions = useMemo(
    () => ({
      onSignalingError: handleSignalingError,
    }),
    [handleSignalingError]
  );

  const {
    sendOffer,
    sendAnswer,
    sendIceCandidate,
    sendIceRestart,
    endCall,
  } = useCallSignaling(activeCall?.conversation_id, signalingOptions);

  // Use enhanced WebRTC hook with callbacks
  const {
    createConnection,
    ensureLocalStream,
    attachLocalTracks,
    cleanup: cleanupWebRtc,
  } = useWebRtc({
    onQualityChange: setLastQualityMetrics,
    onConnectionLost: handleConnectionLost,
    onConnectionRestored: handleConnectionRestored,
    onError: handleWebRtcError,
  });

  // Refs to track state and prevent duplicate processing
  const startedOutgoingRef = useRef(new Set<string>());
  const processingSignalIdsRef = useRef(new Set<string>());
  // Clear refs when call ends
  useEffect(() => {
    if (!activeCall) {
      startedOutgoingRef.current.clear();
      processingSignalIdsRef.current.clear();
      signalingErrorHandledRef.current = null;
    }
  }, [activeCall]);

  // Handle ICE restart requests
  const handleIceRestart = useCallback(
    (offer: RTCSessionDescriptionInit) => {
      if (!activeCall) return;
      const peerUserId = getPeerUserId(activeCall, currentUserId);
      if (peerUserId) {
        sendIceRestart(activeCall.call_id, { to_user_id: peerUserId, sdp: offer });
      }
    },
    [activeCall, currentUserId, sendIceRestart]
  );

  // Prepare connection with enhanced handlers
  const prepareConnection = useCallback(
    async (call: ActiveCall, peerUserId: string) => {
      const connection =
        peerConnection ??
        (await createConnection(
          // ICE candidate handler
          (candidate) => {
            sendIceCandidate(call.call_id, {
              to_user_id: peerUserId,
              candidate: candidate.toJSON(),
            });
          },
          // ICE restart handler
          handleIceRestart
        ));

      const stream = localStream ?? (await ensureLocalStream(call.type === 'VIDEO' ? 'video' : 'audio'));

      if (connection.getSenders().length === 0) {
        await attachLocalTracks(connection, stream);
      }

      return connection;
    },
    [
      attachLocalTracks,
      createConnection,
      ensureLocalStream,
      handleIceRestart,
      localStream,
      peerConnection,
      sendIceCandidate,
    ]
  );

  // Handle outgoing call setup
  useEffect(() => {
    if (!activeCall || activeCall.status !== 'outgoing' || activeCall.initiator_id !== currentUserId) {
      return;
    }

    if (startedOutgoingRef.current.has(activeCall.call_id)) {
      return;
    }

    const peerUserId = getPeerUserId(activeCall, currentUserId);
    if (!peerUserId) {
      return;
    }

    startedOutgoingRef.current.add(activeCall.call_id);

    void (async () => {
      try {
        updateActiveCall({ status: 'connecting', peer_user_id: peerUserId });
        const connection = await prepareConnection(activeCall, peerUserId);
        const offer = await connection.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: activeCall.type === 'VIDEO',
        });
        await connection.setLocalDescription(offer);
        sendOffer(activeCall.call_id, { to_user_id: peerUserId, sdp: offer });
      } catch (error) {
        startedOutgoingRef.current.delete(activeCall.call_id);
        const message = error instanceof Error ? error.message : 'Call setup failed.';
        setCallStatus('failed', message);
        endCall(activeCall.call_id, 'failed');
        cleanupWebRtc();
      }
    })();
  }, [
    activeCall,
    currentUserId,
    endCall,
    prepareConnection,
    sendOffer,
    setCallStatus,
    updateActiveCall,
    cleanupWebRtc,
  ]);

  // Process pending signals
  useEffect(() => {
    if (!activeCall || pendingSignals.length === 0) {
      return;
    }

    const matchingSignals = pendingSignals.filter((signal) => signal.call_id === activeCall.call_id);
    if (matchingSignals.length === 0) {
      return;
    }

    for (const signal of matchingSignals) {
      if (processingSignalIdsRef.current.has(signal.id)) {
        continue;
      }

      processingSignalIdsRef.current.add(signal.id);

      void (async (pendingSignal: PendingCallSignal) => {
        try {
          const payload = pendingSignal.signal.payload as SignalPayload;
          const peerUserId = pendingSignal.signal.from_user_id;

          if (pendingSignal.type === 'call:offer') {
            if (activeCall.initiator_id === currentUserId || !payload.sdp) {
              removeSignal(pendingSignal.id);
              return;
            }

            const connection = await prepareConnection(activeCall, peerUserId);

            // Handle ICE restart
            if (payload.ice_restart && connection.remoteDescription) {
              await connection.setRemoteDescription(new RTCSessionDescription(payload.sdp));
              const answer = await connection.createAnswer();
              await connection.setLocalDescription(answer);
              sendAnswer(activeCall.call_id, { to_user_id: peerUserId, sdp: answer });
              removeSignal(pendingSignal.id);
              return;
            }

            if (!connection.remoteDescription) {
              await connection.setRemoteDescription(new RTCSessionDescription(payload.sdp));
            }
            const answer = await connection.createAnswer();
            await connection.setLocalDescription(answer);
            updateActiveCall({ status: 'connecting', peer_user_id: peerUserId });
            sendAnswer(activeCall.call_id, { to_user_id: peerUserId, sdp: answer });
            removeSignal(pendingSignal.id);
            return;
          }

          if (pendingSignal.type === 'call:answer') {
            if (activeCall.initiator_id !== currentUserId || !payload.sdp) {
              removeSignal(pendingSignal.id);
              return;
            }

            const connection = useCallStore.getState().peerConnection;
            if (!connection || connection.remoteDescription) {
              removeSignal(pendingSignal.id);
              return;
            }

            await connection.setRemoteDescription(new RTCSessionDescription(payload.sdp));
            updateActiveCall({
              status: 'connected',
              peer_user_id: peerUserId,
              connected_at: useCallStore.getState().activeCall?.connected_at ?? new Date().toISOString(),
            });
            removeSignal(pendingSignal.id);
            return;
          }

          if (pendingSignal.type === 'call:ice') {
            const connection = useCallStore.getState().peerConnection;
            if (!connection || !connection.remoteDescription || !payload.candidate) {
              // Queue ICE candidate if remote description not set yet
              if (payload.candidate && connection && !connection.remoteDescription) {
                // Don't remove - will be processed when remote description is set
                return;
              }
              removeSignal(pendingSignal.id);
              return;
            }

            await connection.addIceCandidate(new RTCIceCandidate(payload.candidate));
            removeSignal(pendingSignal.id);
          }
        } catch (error) {
          console.error('[CallController] Signal processing error:', error);
          const message = error instanceof Error ? error.message : 'Call signaling failed.';
          setCallStatus('failed', message);
        } finally {
          processingSignalIdsRef.current.delete(pendingSignal.id);
        }
      })(signal);
    }
  }, [
    activeCall,
    currentUserId,
    peerConnection,
    pendingSignals,
    prepareConnection,
    removeSignal,
    sendAnswer,
    setCallStatus,
    updateActiveCall,
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupWebRtc();
    };
  }, [cleanupWebRtc]);

  return (
    <>
      <IncomingCallDialog />
      <ActiveCallOverlay />
    </>
  );
}
