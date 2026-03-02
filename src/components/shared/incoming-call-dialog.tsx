'use client';

import { useEffect, useCallback } from 'react';
import { Phone, PhoneOff, Video } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/shared/user-avatar';
import { useCallStore } from '@/stores/call-store';
import { useSocket } from '@/providers/socket-provider';
import { useAcceptCall, useDeclineCall, useAddCallParticipant } from '@/queries/use-call-queries';
import { useAuthStore } from '@/stores/auth-store';
import { useWebRTC } from '@/hooks/use-webrtc';
import { cn } from '@/lib/utils';

export function IncomingCallDialog() {
  const uiState = useCallStore((state) => state.uiState);
  const activeCall = useCallStore((state) => state.activeCall);
  const incomingCallerId = useCallStore((state) => state.incomingCallerId);
  const incomingCallerName = useCallStore((state) => state.incomingCallerName);
  const incomingCallType = useCallStore((state) => state.incomingCallType);
  const incomingOfferSdp = useCallStore((state) => state.incomingOfferSdp);
  const acceptCallState = useCallStore((state) => state.acceptCall);
  const declineCallState = useCallStore((state) => state.declineCall);
  const setLocalStream = useCallStore((state) => state.setLocalStream);

  const user = useAuthStore((state) => state.user);
  const { sendCallEnd } = useSocket();
  const acceptCallMutation = useAcceptCall();
  const declineCallMutation = useDeclineCall();
  const addParticipant = useAddCallParticipant();
  const { answerCall, cleanup: cleanupWebRTC } = useWebRTC();

  const isOpen = uiState === 'incoming' && activeCall !== null;

  const handleAccept = useCallback(async () => {
    if (!activeCall || !incomingCallerId || !incomingOfferSdp || !user) return;

    try {
      // 1. Acquire local media
      const constraints: MediaStreamConstraints = {
        audio: true,
        video: incomingCallType === 'VIDEO',
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setLocalStream(stream);

      // 2. Mark as connected on the server
      await acceptCallMutation.mutateAsync(activeCall.id);

      // 3. Add ourselves as a participant
      addParticipant.mutate({ callId: activeCall.id, userId: user.id });

      // 4. Transition to connecting state
      acceptCallState();

      // 5. Create WebRTC peer connection, set remote offer, generate answer, send via WS
      await answerCall(activeCall.id, incomingCallerId, stream, incomingOfferSdp);
    } catch (error) {
      console.error('Failed to accept call:', error);
      handleDecline();
    }
  }, [
    activeCall,
    incomingCallerId,
    incomingOfferSdp,
    incomingCallType,
    user,
    setLocalStream,
    acceptCallMutation,
    addParticipant,
    acceptCallState,
    answerCall,
  ]);

  const handleDecline = useCallback(async () => {
    if (!activeCall) return;

    try {
      await declineCallMutation.mutateAsync(activeCall.id);
      sendCallEnd(activeCall.id, 'DECLINED');
    } catch (error) {
      console.error('Failed to decline call:', error);
    } finally {
      cleanupWebRTC();
      declineCallState();
    }
  }, [activeCall, declineCallMutation, sendCallEnd, cleanupWebRTC, declineCallState]);

  useEffect(() => {
    if (!isOpen) return;

    const audio = new Audio('/sounds/ringtone.mp3');
    audio.loop = true;
    audio.play().catch(() => {
      // autoplay may be blocked
    });

    return () => {
      audio.pause();
      audio.currentTime = 0;
    };
  }, [isOpen]);

  return (
    <Dialog open={isOpen}>
      <DialogContent
        showCloseButton={false}
        className="bg-background/95 border-border backdrop-blur-xl sm:max-w-md"
      >
        <DialogHeader className="items-center space-y-4">
          <div className="relative">
            <div className="absolute inset-0 animate-ping rounded-full bg-primary/30" />
            <div className="absolute inset-0 animate-pulse rounded-full bg-primary/20" />
            <UserAvatar
              user={{
                id: incomingCallerId || '',
                display_name: incomingCallerName || 'Unknown',
              }}
              size="xl"
              className="relative"
            />
          </div>
          <div className="text-center">
            <DialogTitle className="text-xl text-foreground">
              {incomingCallerName || 'Unknown'}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Incoming {incomingCallType === 'VIDEO' ? 'video' : 'voice'} call...
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="flex justify-center gap-8 pt-6">
          <Button
            variant="destructive"
            size="icon-lg"
            onClick={handleDecline}
            disabled={declineCallMutation.isPending}
            className={cn(
              'h-16 w-16 rounded-full',
              'bg-destructive hover:bg-destructive/90',
              'shadow-lg shadow-destructive/20'
            )}
          >
            <PhoneOff className="h-7 w-7" />
          </Button>

          <Button
            size="icon-lg"
            onClick={handleAccept}
            disabled={acceptCallMutation.isPending}
            className={cn(
              'h-16 w-16 rounded-full',
              'bg-green-500 hover:bg-green-600 text-white',
              'shadow-lg shadow-green-500/20'
            )}
          >
            {incomingCallType === 'VIDEO' ? (
              <Video className="h-7 w-7" />
            ) : (
              <Phone className="h-7 w-7" />
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
