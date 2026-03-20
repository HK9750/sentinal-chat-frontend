'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Mic, MicOff, PhoneOff, Video, VideoOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/shared/user-avatar';
import { useCallSignaling } from '@/hooks/use-call-signaling';
import { useCallStore } from '@/stores/call-store';
import { useAuthStore } from '@/stores/auth-store';
import { getOtherParticipant, cn } from '@/lib/utils';
import { useConversation } from '@/queries/use-conversation-queries';

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

export function ActiveCallOverlay() {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const activeCall = useCallStore((state) => state.activeCall);
  const [now, setNow] = useState(() => Date.now());
  const localStream = useCallStore((state) => state.localStream);
  const remoteStream = useCallStore((state) => state.remoteStream);
  const microphoneMuted = useCallStore((state) => state.microphoneMuted);
  const cameraMuted = useCallStore((state) => state.cameraMuted);
  const toggleMicrophone = useCallStore((state) => state.toggleMicrophone);
  const toggleCamera = useCallStore((state) => state.toggleCamera);
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
    }
  }, [remoteStream]);

  const title = useMemo(() => {
    if (!activeCall) {
      return 'Call';
    }

    if (activeCall.status === 'connecting' || activeCall.status === 'outgoing') {
		return activeCall.type === 'VIDEO' ? 'Connecting video call' : 'Connecting voice call';
    }

    if (activeCall.status === 'ended') {
      return 'Call ended';
    }

    return activeCall.type === 'VIDEO' ? 'Video call' : 'Voice call';
  }, [activeCall]);

  const elapsedTime = (() => {
    if (!activeCall?.started_at) {
      return 0;
    }

    return Math.max(0, Math.floor((now - new Date(activeCall.started_at).getTime()) / 1000));
  })();

  if (!activeCall) {
    return null;
  }

  const showVideoLayout = activeCall.type === 'VIDEO';
  const participantName = otherParticipant?.display_name ?? otherParticipant?.username ?? 'Contact';
  const handleEnd = () => {
    if (activeCall.status !== 'ended') {
      endCall(activeCall.call_id, 'hangup');
    }
    resetCall();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background/96 backdrop-blur-xl pb-[max(env(safe-area-inset-bottom),0px)]">
      <div className="flex items-center justify-between border-b border-border/70 px-6 py-4">
        <div>
          <p className="section-kicker">Call</p>
          <h2 className="mt-1 text-xl font-semibold tracking-[-0.04em]">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {activeCall.status === 'connected'
              ? `${participantName} · ${formatDuration(elapsedTime)}`
              : activeCall.ended_reason ?? participantName}
          </p>
        </div>
        <Button type="button" variant="destructive" size="icon-lg" onClick={handleEnd} className="rounded-full">
          <PhoneOff className="h-5 w-5" />
        </Button>
      </div>

      <div className="flex flex-1 items-center justify-center px-6 py-6">
        {showVideoLayout ? (
          <div className="grid h-full w-full max-w-6xl gap-4 md:grid-cols-[minmax(0,1fr)_220px] lg:grid-cols-[minmax(0,1fr)_280px]">
            <div className="flex min-h-[240px] items-center justify-center overflow-hidden rounded-[28px] border border-border/70 bg-card/60 md:min-h-[320px]">
              {remoteStream ? (
                <video ref={remoteVideoRef} autoPlay playsInline className="h-full w-full object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-4 text-center">
                  <UserAvatar size="xl" src={otherParticipant?.avatar_url} alt={participantName} fallback={participantName[0] ?? 'C'} />
                  <p className="text-sm text-muted-foreground">Waiting for {participantName}&apos;s video stream.</p>
                </div>
              )}
            </div>

            <div className="flex min-h-[180px] items-center justify-center overflow-hidden rounded-[28px] border border-border/70 bg-card/60 md:min-h-[240px]">
              {localStream && !cameraMuted ? (
                <video ref={localVideoRef} autoPlay playsInline muted className={cn('h-full w-full object-cover', 'scale-x-[-1]')} />
              ) : (
                <div className="flex flex-col items-center gap-4 text-center">
                  <UserAvatar size="xl" user={{ display_name: 'You' }} />
                  <p className="text-sm text-muted-foreground">Camera is off on this device.</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-5 text-center">
            <UserAvatar size="xl" src={otherParticipant?.avatar_url} alt={participantName} fallback={participantName[0] ?? 'C'} />
            <div>
              <p className="text-lg font-semibold">Voice call with {participantName}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {activeCall.status === 'connected' ? formatDuration(elapsedTime) : 'Waiting for the other person to join.'}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-center gap-4 border-t border-border/70 px-6 py-6 pb-[max(env(safe-area-inset-bottom),1.5rem)]">
        <Button
          type="button"
          variant="outline"
          size="icon-lg"
          onClick={toggleMicrophone}
          className="rounded-full"
        >
          {microphoneMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        </Button>

        {showVideoLayout ? (
          <Button type="button" variant="outline" size="icon-lg" onClick={toggleCamera} className="rounded-full">
            {cameraMuted ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
          </Button>
        ) : null}

        <Button type="button" variant="destructive" size="icon-lg" onClick={handleEnd} className="rounded-full">
          <PhoneOff className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
