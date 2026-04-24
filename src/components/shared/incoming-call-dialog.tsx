'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Phone, PhoneOff, ShieldCheck, Video } from 'lucide-react';
import { useCallSignaling } from '@/hooks/use-call-signaling';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { UserAvatar } from '@/components/shared/user-avatar';
import { cn, getOtherParticipant } from '@/lib/utils';
import { useConversation } from '@/queries/use-conversation-queries';
import { useAuthStore } from '@/stores/auth-store';
import { useCallStore } from '@/stores/call-store';

// Ringtone simulation using Web Audio API
function useRingtone(isRinging: boolean) {
  useEffect(() => {
    if (!isRinging) return;

    let audioContext: AudioContext | null = null;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const playTone = () => {
      if (!audioContext) {
        audioContext = new AudioContext();
      }

      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 440;
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.1);
      gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.4);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    };

    // Play ringtone pattern
    playTone();
    intervalId = setInterval(() => {
      playTone();
    }, 2000);

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
      if (audioContext) {
        audioContext.close();
      }
    };
  }, [isRinging]);
}

export function IncomingCallDialog() {
  const currentUserId = useAuthStore((state) => state.user?.id);
  const incomingCall = useCallStore((state) => state.incomingCall);
  const setIncomingCall = useCallStore((state) => state.setIncomingCall);
  const setActiveCall = useCallStore((state) => state.setActiveCall);
  const resetCall = useCallStore((state) => state.resetCall);
  const { endCall } = useCallSignaling(incomingCall?.conversation_id);
  const conversationQuery = useConversation(incomingCall?.conversation_id);
  const [pulseIndex, setPulseIndex] = useState(0);
  
  const otherParticipant = useMemo(
    () => (conversationQuery.data ? getOtherParticipant(conversationQuery.data, currentUserId) : null),
    [conversationQuery.data, currentUserId]
  );
  const callerName = otherParticipant?.display_name ?? otherParticipant?.username ?? 'Incoming caller';
  const isVideoCall = incomingCall?.type === 'VIDEO';

  // Use ringtone
  useRingtone(Boolean(incomingCall));

  // Pulse animation index
  useEffect(() => {
    if (!incomingCall) return;
    
    const interval = setInterval(() => {
      setPulseIndex((prev) => (prev + 1) % 3);
    }, 400);

    return () => clearInterval(interval);
  }, [incomingCall]);

  const handleDecline = useCallback(() => {
    if (incomingCall) {
      if (process.env.NODE_ENV !== 'production') {
        console.debug('[CALL_END] incoming call declined locally', {
          call_id: incomingCall.call_id,
          conversation_id: incomingCall.conversation_id,
        });
      }
      endCall(incomingCall.call_id, 'declined');
    }
    resetCall();
  }, [endCall, incomingCall, resetCall]);

  const handleAccept = useCallback(() => {
    if (!incomingCall) {
      return;
    }

    setActiveCall({
      call_id: incomingCall.call_id,
      conversation_id: incomingCall.conversation_id,
      type: incomingCall.type,
      peer_user_id: incomingCall.initiated_by,
      initiator_id: incomingCall.initiated_by,
      started_at: incomingCall.started_at,
      status: 'connecting',
      participant_ids: incomingCall.participant_ids,
    });
    setIncomingCall(null);
  }, [incomingCall, setActiveCall, setIncomingCall]);

  return (
    <Dialog open={Boolean(incomingCall)} onOpenChange={(open) => (!open ? handleDecline() : undefined)}>
      <DialogContent
        showCloseButton={false}
        className="overflow-hidden border-border bg-card p-0 shadow-2xl sm:max-w-[400px]"
      >
        <DialogTitle className="sr-only">Incoming call</DialogTitle>
        <DialogDescription className="sr-only">{callerName}</DialogDescription>

        <Card className="rounded-none border-0 bg-card py-0 shadow-none">
          {/* Animated gradient background */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div 
              className={cn(
                "absolute -inset-[50%] opacity-30",
                "animate-spin-slow",
                isVideoCall 
                  ? "bg-[conic-gradient(from_0deg,transparent,hsl(var(--primary)),transparent,hsl(var(--primary)),transparent)]"
                  : "bg-[conic-gradient(from_0deg,transparent,hsl(var(--primary)/0.5),transparent,hsl(var(--primary)/0.5),transparent)]"
              )}
              style={{ animationDuration: '8s' }}
            />
          </div>

          <CardHeader className="relative items-center overflow-hidden px-6 pb-4 pt-8 text-center">
            {/* Call type badge */}
            <Badge
              variant={isVideoCall ? "default" : "secondary"}
              className={cn(
                "mb-4 gap-1.5 rounded-full px-4 py-1.5 text-xs font-medium uppercase tracking-wider",
                isVideoCall && "bg-primary text-primary-foreground"
              )}
            >
              {isVideoCall ? (
                <>
                  <Video className="h-3.5 w-3.5" />
                  Video Call
                </>
              ) : (
                <>
                  <Phone className="h-3.5 w-3.5" />
                  Voice Call
                </>
              )}
            </Badge>

            {/* Avatar with animated rings */}
            <div className="relative mt-2">
              {/* Pulsing rings */}
              {[0, 1, 2].map((index) => (
                <div
                  key={index}
                  className={cn(
                    "absolute inset-0 rounded-full border-2",
                    isVideoCall ? "border-primary" : "border-primary/50",
                    "transition-all duration-500"
                  )}
                  style={{
                    transform: `scale(${1 + (index + 1) * 0.15 + (pulseIndex === index ? 0.1 : 0)})`,
                    opacity: pulseIndex === index ? 0.6 : 0.2,
                  }}
                />
              ))}
              
              {/* Main avatar container */}
              <div className={cn(
                "relative rounded-full p-1",
                "bg-gradient-to-br from-primary/20 to-primary/5",
                "ring-2 ring-primary/30"
              )}>
                <UserAvatar
                  size="xl"
                  className="relative h-28 w-28 shadow-xl"
                  src={otherParticipant?.avatar_url}
                  alt={callerName}
                  fallback={callerName[0] ?? 'C'}
                />
                
                {/* Online indicator */}
                <div className="absolute bottom-1 right-1 h-5 w-5 rounded-full bg-primary ring-4 ring-card" />
              </div>
            </div>

            <CardTitle className="mt-5 text-xl font-semibold">{callerName}</CardTitle>
            <CardDescription className="mt-1 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
              </span>
              {isVideoCall ? 'Video calling you...' : 'Calling you...'}
            </CardDescription>
          </CardHeader>

          <Separator className="opacity-50" />

          <CardContent className="relative space-y-3 px-6 py-4 text-center">
            <p className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <span>End-to-end encrypted</span>
            </p>
          </CardContent>

          <CardFooter className="relative justify-center gap-4 px-6 pb-8 pt-2">
            {/* Decline button */}
            <div className="flex flex-col items-center gap-2">
              <Button
                type="button"
                variant="destructive"
                size="icon"
                onClick={handleDecline}
                className={cn(
                  "h-14 w-14 rounded-full shadow-lg",
                  "hover:scale-105 active:scale-95",
                  "transition-all duration-200"
                )}
                aria-label="Decline call"
              >
                <PhoneOff className="h-6 w-6" />
              </Button>
              <span className="text-xs text-muted-foreground">Decline</span>
            </div>

            {/* Accept button */}
            <div className="flex flex-col items-center gap-2">
              <Button
                type="button"
                size="icon"
                onClick={handleAccept}
                className={cn(
                  "h-14 w-14 rounded-full shadow-lg",
                  "bg-primary hover:bg-primary/90",
                  "hover:scale-105 active:scale-95",
                  "transition-all duration-200",
                  "animate-pulse"
                )}
                style={{ animationDuration: '1.5s' }}
                aria-label="Accept call"
              >
                {isVideoCall ? (
                  <Video className="h-6 w-6" />
                ) : (
                  <Phone className="h-6 w-6" />
                )}
              </Button>
              <span className="text-xs text-muted-foreground">Accept</span>
            </div>
          </CardFooter>
        </Card>
      </DialogContent>
    </Dialog>
  );
}
