'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  LoaderCircle,
  Mic,
  MicOff,
  Phone,
  Monitor,
  ShieldCheck,
  Video,
  VideoOff,
  X,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { UserAvatar } from '@/components/shared/user-avatar';
import { useCallSignaling } from '@/hooks/use-call-signaling';
import { useCallStore } from '@/stores/call-store';
import { useAuthStore } from '@/stores/auth-store';
import { cn, getOtherParticipant } from '@/lib/utils';
import { useConversation } from '@/queries/use-conversation-queries';

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

interface ControlButtonProps {
  label: string;
  pressed?: boolean;
  destructive?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

function ControlButton({ label, pressed, destructive = false, onClick, children }: ControlButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          size="icon-lg"
          variant={destructive ? 'destructive' : pressed ? 'default' : 'secondary'}
          className="h-12 w-12 rounded-full"
          onClick={onClick}
          aria-label={label}
          aria-pressed={pressed}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={8}>{label}</TooltipContent>
    </Tooltip>
  );
}

const CALL_STATUS_LABEL: Record<string, string> = {
  outgoing: 'Calling…',
  connecting: 'Connecting…',
  connected: 'Connected',
  ended: 'Call ended',
  failed: 'Call failed',
};

export function ActiveCallOverlay() {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const activeCall = useCallStore((state) => state.activeCall);
  const [now, setNow] = useState(() => Date.now());
  const [speakerEnabled, setSpeakerEnabled] = useState(true);
  const localStream = useCallStore((state) => state.localStream);
  const remoteStream = useCallStore((state) => state.remoteStream);
  const microphoneMuted = useCallStore((state) => state.microphoneMuted);
  const cameraMuted = useCallStore((state) => state.cameraMuted);
  const toggleMicrophone = useCallStore((state) => state.toggleMicrophone);
  const toggleCamera = useCallStore((state) => state.toggleCamera);
  const callQuality = useCallStore((state) => state.callQuality);
  const isReconnecting = useCallStore((state) => state.isReconnecting);
  const resetCall = useCallStore((state) => state.resetCall);
  const currentUserId = useAuthStore((state) => state.user?.id);
  const conversationQuery = useConversation(activeCall?.conversation_id);
  const { endCall } = useCallSignaling(activeCall?.conversation_id);

  useEffect(() => {
    if (!activeCall || activeCall.status !== 'connected') {
      return;
    }

    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [activeCall]);

  const otherParticipant = useMemo(
    () => (conversationQuery.data ? getOtherParticipant(conversationQuery.data, currentUserId) : null),
    [conversationQuery.data, currentUserId]
  );

  useEffect(() => {
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
      remoteVideoRef.current.muted = !speakerEnabled;
      remoteVideoRef.current.volume = speakerEnabled ? 1 : 0;
    }
  }, [remoteStream, speakerEnabled]);

  useEffect(() => {
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = remoteStream;
      remoteAudioRef.current.muted = !speakerEnabled;
      remoteAudioRef.current.volume = speakerEnabled ? 1 : 0;
    }
  }, [remoteStream, speakerEnabled]);

  const elapsedTime = (() => {
    if (!activeCall) {
      return 0;
    }

    const startTimestamp = activeCall.connected_at ?? activeCall.started_at;
    if (!startTimestamp) {
      return 0;
    }

    return Math.max(0, Math.floor((now - new Date(startTimestamp).getTime()) / 1000));
  })();

  if (!activeCall) {
    return null;
  }

  const showVideoLayout = activeCall.type === 'VIDEO';
  const participantName = otherParticipant?.display_name ?? otherParticipant?.username ?? 'Contact';

  const statusText = (() => {
    if (isReconnecting) {
      return 'Reconnecting…';
    }

    if (activeCall.status === 'connected') {
      const qualityText =
        callQuality === 'unknown'
          ? 'Good network'
          : callQuality === 'excellent'
            ? 'Excellent network'
            : callQuality === 'good'
              ? 'Good network'
              : callQuality === 'fair'
                ? 'Fair network'
                : 'Poor network';
      return `${formatDuration(elapsedTime)} · ${qualityText}`;
    }

    if (activeCall.ended_reason) {
      return activeCall.ended_reason;
    }

    return CALL_STATUS_LABEL[activeCall.status] ?? 'Connecting…';
  })();

  const handleEnd = () => {
    if (activeCall.status !== 'ended') {
      endCall(activeCall.call_id, 'hangup');
    }
    resetCall();
  };

  const toggleSpeaker = () => {
    setSpeakerEnabled((prev) => !prev);
  };

  const isConnecting = activeCall.status === 'outgoing' || activeCall.status === 'connecting';
  const qualityVariant =
    callQuality === 'excellent'
      ? 'default'
      : callQuality === 'good'
        ? 'secondary'
        : callQuality === 'fair' || callQuality === 'poor'
          ? 'outline'
          : 'secondary';

  return (
    <TooltipProvider delayDuration={120}>
      <div className="fixed inset-0 z-50 flex flex-col bg-background/95 text-foreground backdrop-blur-sm">
      {activeCall.type === 'AUDIO' ? <audio ref={remoteAudioRef} autoPlay playsInline /> : null}

      <div className="flex items-center justify-between px-4 pb-3 pt-[max(env(safe-area-inset-top),0.75rem)]">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Sentinel Call</p>
          <h2 className="mt-1 text-lg font-semibold text-foreground">{participantName}</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">{statusText}</p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant={qualityVariant} className="hidden sm:inline-flex">
            {callQuality === 'unknown' ? 'Network unknown' : `${callQuality} network`}
          </Badge>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-10 w-10 rounded-full"
            onClick={handleEnd}
            aria-label="Close call view"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <Separator />

      <div className="relative flex flex-1 items-center justify-center overflow-hidden px-3 pb-3">
        {showVideoLayout ? (
          <>
            <Card className="relative h-full w-full overflow-hidden rounded-[20px] border-border bg-muted py-0 shadow-sm">
              {remoteStream ? (
                <video ref={remoteVideoRef} autoPlay playsInline className="h-full w-full object-cover" />
              ) : (
                <CardContent className="flex h-full flex-col items-center justify-center gap-4 text-center">
                  <Badge variant="secondary" className="rounded-full">Remote video</Badge>
                  <UserAvatar
                    size="xl"
                    src={otherParticipant?.avatar_url}
                    alt={participantName}
                    fallback={participantName[0] ?? 'C'}
                    className="h-28 w-28"
                  />
                  <p className="text-sm text-muted-foreground">Waiting for {participantName}&apos;s camera…</p>
                  {isConnecting ? (
                    <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                      Connecting media
                    </p>
                  ) : null}
                </CardContent>
              )}
            </Card>

            <Card className="absolute bottom-7 right-6 h-[30vh] min-h-[170px] w-[36vw] min-w-[132px] max-w-[210px] overflow-hidden rounded-2xl border-border bg-card py-0 shadow-xl">
              {localStream && !cameraMuted ? (
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className={cn('h-full w-full object-cover', 'scale-x-[-1]')}
                />
              ) : (
                <CardContent className="flex h-full flex-col items-center justify-center gap-2">
                  <UserAvatar size="lg" user={{ display_name: 'You' }} className="h-14 w-14" />
                  <p className="text-xs text-muted-foreground">Camera off</p>
                </CardContent>
              )}
            </Card>
          </>
        ) : (
          <Card className="flex w-full max-w-md flex-col items-center rounded-2xl border-border bg-card py-0 text-center shadow-sm">
            <CardHeader className="items-center pb-2 pt-8">
              <Badge variant="secondary" className="rounded-full">Voice call</Badge>
              <UserAvatar
                size="xl"
                src={otherParticipant?.avatar_url}
                alt={participantName}
                fallback={participantName[0] ?? 'C'}
                className="mt-4 h-28 w-28"
              />
              <CardTitle className="mt-2">{participantName}</CardTitle>
              <CardDescription>{statusText}</CardDescription>
            </CardHeader>
            <CardContent className="pb-7 pt-2">
              <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                Secure voice call
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      <Separator />

      <div className="flex items-center justify-center gap-4 px-4 pb-[max(env(safe-area-inset-bottom),1.5rem)] pt-3">
        <ControlButton
          label={microphoneMuted ? 'Unmute microphone' : 'Mute microphone'}
          pressed={microphoneMuted}
          onClick={toggleMicrophone}
        >
          {microphoneMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        </ControlButton>

        {showVideoLayout ? (
          <ControlButton
            label={cameraMuted ? 'Turn camera on' : 'Turn camera off'}
            pressed={cameraMuted}
            onClick={toggleCamera}
          >
            {cameraMuted ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
          </ControlButton>
        ) : null}

        <ControlButton
          label={speakerEnabled ? 'Disable speaker' : 'Enable speaker'}
          pressed={speakerEnabled}
          onClick={toggleSpeaker}
        >
          <Monitor className="h-5 w-5" />
        </ControlButton>

        <ControlButton label="End call" destructive onClick={handleEnd}>
          <Phone className="h-5 w-5 rotate-[135deg]" />
        </ControlButton>

      </div>
      </div>
    </TooltipProvider>
  );
}
