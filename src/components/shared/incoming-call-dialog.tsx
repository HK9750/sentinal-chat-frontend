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
import { useAcceptCall, useDeclineCall } from '@/queries/use-call-queries';
import { cn } from '@/lib/utils';

export function IncomingCallDialog() {
  const uiState = useCallStore((state) => state.uiState);
  const activeCall = useCallStore((state) => state.activeCall);
  const incomingCallerId = useCallStore((state) => state.incomingCallerId);
  const incomingCallerName = useCallStore((state) => state.incomingCallerName);
  const incomingCallType = useCallStore((state) => state.incomingCallType);
  const acceptCallState = useCallStore((state) => state.acceptCall);
  const declineCallState = useCallStore((state) => state.declineCall);
  const setLocalStream = useCallStore((state) => state.setLocalStream);

  const { sendCallEnd } = useSocket();
  const acceptCallMutation = useAcceptCall();
  const declineCallMutation = useDeclineCall();

  const isOpen = uiState === 'incoming' && activeCall !== null;

  const handleAccept = useCallback(async () => {
    if (!activeCall) return;

    try {
      // Get user media
      const constraints: MediaStreamConstraints = {
        audio: true,
        video: incomingCallType === 'VIDEO',
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setLocalStream(stream);

      // Accept the call via API
      await acceptCallMutation.mutateAsync(activeCall.id);

      // Update local state
      acceptCallState();
    } catch (error) {
      console.error('Failed to accept call:', error);
      // If we fail to get media, decline the call
      handleDecline();
    }
  }, [activeCall, incomingCallType, setLocalStream, acceptCallMutation, acceptCallState]);

  const handleDecline = useCallback(async () => {
    if (!activeCall) return;

    try {
      await declineCallMutation.mutateAsync(activeCall.id);
      sendCallEnd(activeCall.id, 'DECLINED');
    } catch (error) {
      console.error('Failed to decline call:', error);
    } finally {
      declineCallState();
    }
  }, [activeCall, declineCallMutation, sendCallEnd, declineCallState]);

  // Play ringtone when incoming call
  useEffect(() => {
    if (!isOpen) return;

    // Browser will require user interaction for audio, but we can try
    const audio = new Audio('/sounds/ringtone.mp3');
    audio.loop = true;
    audio.play().catch(() => {
      // Audio playback was blocked, ignore
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
        className="bg-slate-900/95 border-slate-700 backdrop-blur-xl sm:max-w-md"
      >
        <DialogHeader className="items-center space-y-4">
          <div className="relative">
            <div className="absolute inset-0 animate-ping rounded-full bg-blue-500/30" />
            <div className="absolute inset-0 animate-pulse rounded-full bg-blue-500/20" />
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
            <DialogTitle className="text-xl text-slate-100">
              {incomingCallerName || 'Unknown'}
            </DialogTitle>
            <DialogDescription className="text-slate-400">
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
              'bg-red-600 hover:bg-red-700',
              'shadow-lg shadow-red-900/50'
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
              'bg-emerald-600 hover:bg-emerald-700',
              'shadow-lg shadow-emerald-900/50'
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
