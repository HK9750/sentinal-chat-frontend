'use client';

import { useCallback, useEffect, useRef } from 'react';
import { ActiveCallOverlay } from '@/components/shared/active-call-overlay';
import { IncomingCallDialog } from '@/components/shared/incoming-call-dialog';
import { useCallSignaling } from '@/hooks/use-call-signaling';
import { useWebRtc } from '@/hooks/use-webrtc';
import { useCallStore } from '@/stores/call-store';
import { useAuthStore } from '@/stores/auth-store';
import type { ActiveCall } from '@/types';
import type { PendingCallSignal } from '@/stores/call-store';

type SignalPayload = {
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
};

function getPeerUserId(call: ActiveCall, currentUserId?: string | null): string | null {
  return call.peer_user_id ?? call.participant_ids?.find((participantId: string) => participantId !== currentUserId) ?? null;
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
  const { createPeerConnection, ensureLocalStream, attachLocalTracks } = useWebRtc();
  const { sendOffer, sendAnswer, sendIceCandidate, endCall } = useCallSignaling(activeCall?.conversation_id);
  const startedOutgoingRef = useRef(new Set<string>());
  const processingSignalIdsRef = useRef(new Set<string>());

  useEffect(() => {
    if (activeCall) {
      return;
    }

    startedOutgoingRef.current.clear();
    processingSignalIdsRef.current.clear();
  }, [activeCall]);

  const prepareConnection = useCallback(
    async (call: ActiveCall, peerUserId: string) => {
      const connection = peerConnection ?? (await createPeerConnection());

      connection.onicecandidate = (event) => {
        if (!event.candidate) {
          return;
        }

        sendIceCandidate(call.call_id, {
          to_user_id: peerUserId,
          candidate: event.candidate.toJSON(),
        });
      };

      connection.onconnectionstatechange = () => {
        if (connection.connectionState === 'connected') {
          setCallStatus('connected');
          return;
        }

        if (connection.connectionState === 'failed') {
          setCallStatus('failed', 'Connection failed.');
        }
      };

      const stream = localStream ?? (await ensureLocalStream(call.type === 'VIDEO' ? 'video' : 'audio'));

      if (connection.getSenders().length === 0) {
        await attachLocalTracks(connection, stream);
      }

      return connection;
    },
    [attachLocalTracks, createPeerConnection, ensureLocalStream, localStream, peerConnection, sendIceCandidate, setCallStatus]
  );

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
        const offer = await connection.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: activeCall.type === 'VIDEO' });
        await connection.setLocalDescription(offer);
        sendOffer(activeCall.call_id, { to_user_id: peerUserId, sdp: offer });
      } catch (error) {
        startedOutgoingRef.current.delete(activeCall.call_id);
        setCallStatus('failed', error instanceof Error ? error.message : 'Call setup failed.');
        endCall(activeCall.call_id, 'failed');
      }
    })();
  }, [activeCall, currentUserId, endCall, prepareConnection, sendOffer, setCallStatus, updateActiveCall]);

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
              return;
            }

            const connection = await prepareConnection(activeCall, peerUserId);
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
              return;
            }

            const connection = peerConnection;
            if (!connection || connection.remoteDescription) {
              removeSignal(pendingSignal.id);
              return;
            }

            await connection.setRemoteDescription(new RTCSessionDescription(payload.sdp));
            updateActiveCall({ status: 'connected', peer_user_id: peerUserId });
            removeSignal(pendingSignal.id);
            return;
          }

          if (pendingSignal.type === 'call:ice') {
            const connection = peerConnection;
            if (!connection || !connection.remoteDescription || !payload.candidate) {
              return;
            }

            await connection.addIceCandidate(new RTCIceCandidate(payload.candidate));
            removeSignal(pendingSignal.id);
          }
        } catch (error) {
          setCallStatus('failed', error instanceof Error ? error.message : 'Call signaling failed.');
        } finally {
          processingSignalIdsRef.current.delete(pendingSignal.id);
        }
      })(signal);
    }
  }, [activeCall, currentUserId, peerConnection, pendingSignals, prepareConnection, removeSignal, sendAnswer, setCallStatus, updateActiveCall]);

  return (
    <>
      <IncomingCallDialog />
      <ActiveCallOverlay />
    </>
  );
}
