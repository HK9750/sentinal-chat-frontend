'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Monitor,
  Users,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/shared/user-avatar';
import { useCallStore } from '@/stores/call-store';
import { useSocket } from '@/providers/socket-provider';
import { useEndCall, useUpdateParticipantMute, useCallParticipants } from '@/queries/use-call-queries';
import { useAuthStore } from '@/stores/auth-store';
import { cn } from '@/lib/utils';

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function ActiveCallOverlay() {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isMinimized, setIsMinimized] = useState(false);

  // Call state
  const uiState = useCallStore((state) => state.uiState);
  const activeCall = useCallStore((state) => state.activeCall);
  const localStream = useCallStore((state) => state.localStream);
  const localMediaState = useCallStore((state) => state.localMediaState);
  const remoteStreams = useCallStore((state) => state.remoteStreams);
  const participants = useCallStore((state) => state.participants);
  const callStartTime = useCallStore((state) => state.callStartTime);
  const toggleAudio = useCallStore((state) => state.toggleAudio);
  const toggleVideo = useCallStore((state) => state.toggleVideo);
  const toggleScreenShare = useCallStore((state) => state.toggleScreenShare);
  const endCallState = useCallStore((state) => state.endCall);

  const user = useAuthStore((state) => state.user);
  const { sendCallEnd } = useSocket();
  const endCallMutation = useEndCall();
  const updateMuteMutation = useUpdateParticipantMute();

  // Fetch participants if we have an active call
  const { data: fetchedParticipants } = useCallParticipants(activeCall?.id || '');

  const isVisible = uiState === 'active' || uiState === 'connecting';
  const isConnecting = uiState === 'connecting';
  const isVideoCall = activeCall?.type === 'VIDEO';

  // Set local video stream
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Timer for call duration
  useEffect(() => {
    if (!callStartTime || !isVisible) return;

    const interval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - callStartTime) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [callStartTime, isVisible]);

  const handleToggleAudio = useCallback(() => {
    toggleAudio();
    
    if (activeCall && user) {
      updateMuteMutation.mutate({
        callId: activeCall.id,
        userId: user.id,
        audioMuted: !localMediaState.audioEnabled,
        videoMuted: !localMediaState.videoEnabled,
      });
    }
  }, [toggleAudio, activeCall, user, localMediaState, updateMuteMutation]);

  const handleToggleVideo = useCallback(() => {
    toggleVideo();
    
    if (activeCall && user) {
      updateMuteMutation.mutate({
        callId: activeCall.id,
        userId: user.id,
        audioMuted: !localMediaState.audioEnabled,
        videoMuted: !localMediaState.videoEnabled,
      });
    }
  }, [toggleVideo, activeCall, user, localMediaState, updateMuteMutation]);

  const handleEndCall = useCallback(async () => {
    if (!activeCall) return;

    try {
      await endCallMutation.mutateAsync({
        callId: activeCall.id,
        reason: 'COMPLETED',
      });
      sendCallEnd(activeCall.id, 'COMPLETED');
    } catch (error) {
      console.error('Failed to end call:', error);
    } finally {
      endCallState();
    }
  }, [activeCall, endCallMutation, sendCallEnd, endCallState]);

  if (!isVisible) return null;

  // Get other participants (not the current user)
  const otherParticipants = (fetchedParticipants || participants).filter(
    (p) => p.user_id !== user?.id
  );

  if (isMinimized) {
    return (
      <div
        className={cn(
          'fixed bottom-4 right-4 z-50',
          'flex items-center gap-3 rounded-full',
          'bg-slate-800/95 backdrop-blur-xl border border-slate-700',
          'px-4 py-2 shadow-2xl cursor-pointer'
        )}
        onClick={() => setIsMinimized(false)}
      >
        <div className="flex items-center gap-2">
          {otherParticipants.slice(0, 3).map((participant) => (
            <UserAvatar
              key={participant.user_id}
              user={participant.user}
              size="sm"
            />
          ))}
        </div>
        <span className="text-sm text-slate-300 font-medium">
          {formatDuration(elapsedTime)}
        </span>
        <div className="flex items-center gap-1">
          {localMediaState.audioEnabled ? (
            <Mic className="h-4 w-4 text-emerald-400" />
          ) : (
            <MicOff className="h-4 w-4 text-red-400" />
          )}
        </div>
        <Button
          variant="destructive"
          size="icon-sm"
          onClick={(e) => {
            e.stopPropagation();
            handleEndCall();
          }}
          className="h-8 w-8 rounded-full bg-red-600 hover:bg-red-700"
        >
          <PhoneOff className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'fixed inset-0 z-50',
        'bg-slate-900/98 backdrop-blur-xl',
        'flex flex-col'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-4">
          <div
            className={cn(
              'px-3 py-1 rounded-full text-sm font-medium',
              isConnecting
                ? 'bg-yellow-600/20 text-yellow-400'
                : 'bg-emerald-600/20 text-emerald-400'
            )}
          >
            {isConnecting ? 'Connecting...' : formatDuration(elapsedTime)}
          </div>
          <div className="flex items-center gap-2 text-slate-400">
            <Users className="h-4 w-4" />
            <span className="text-sm">
              {(fetchedParticipants || participants).length} participant(s)
            </span>
          </div>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsMinimized(true)}
          className="text-slate-400 hover:text-slate-100"
        >
          <Minimize2 className="h-5 w-5" />
        </Button>
      </div>

      {/* Video Grid */}
      <div className="flex-1 p-6">
        {isVideoCall ? (
          <div className="relative h-full">
            {/* Remote videos */}
            <div className="grid gap-4 h-full grid-cols-1 md:grid-cols-2">
              {otherParticipants.map((participant) => {
                const remoteStream = remoteStreams.get(participant.user_id);
                return (
                  <div
                    key={participant.user_id}
                    className={cn(
                      'relative rounded-2xl overflow-hidden',
                      'bg-slate-800 border border-slate-700'
                    )}
                  >
                    {remoteStream ? (
                      <video
                        autoPlay
                        playsInline
                        ref={(el) => {
                          if (el) el.srcObject = remoteStream;
                        }}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full">
                        <UserAvatar
                          user={participant.user}
                          size="xl"
                        />
                        <span className="mt-4 text-slate-300 font-medium">
                          {participant.user?.display_name || 'Participant'}
                        </span>
                        {participant.video_muted && (
                          <span className="mt-2 text-sm text-slate-500">
                            Camera off
                          </span>
                        )}
                      </div>
                    )}

                    {/* Participant info overlay */}
                    <div className="absolute bottom-3 left-3 flex items-center gap-2">
                      <span className="text-sm text-white font-medium px-2 py-1 bg-black/50 rounded-md">
                        {participant.user?.display_name || 'Participant'}
                      </span>
                      {participant.audio_muted && (
                        <MicOff className="h-4 w-4 text-red-400" />
                      )}
                    </div>
                  </div>
                );
              })}

              {otherParticipants.length === 0 && (
                <div className="flex items-center justify-center h-full rounded-2xl bg-slate-800 border border-slate-700">
                  <span className="text-slate-400">
                    Waiting for others to join...
                  </span>
                </div>
              )}
            </div>

            {/* Local video (picture-in-picture) */}
            <div
              className={cn(
                'absolute bottom-4 right-4',
                'w-48 h-36 rounded-xl overflow-hidden',
                'bg-slate-800 border-2 border-slate-600',
                'shadow-2xl'
              )}
            >
              {localStream && localMediaState.videoEnabled ? (
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover mirror"
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <UserAvatar user={user} size="lg" />
                </div>
              )}
              {!localMediaState.audioEnabled && (
                <div className="absolute bottom-2 right-2">
                  <MicOff className="h-4 w-4 text-red-400" />
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Audio-only call view */
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-6">
              <div className="flex gap-4">
                {otherParticipants.map((participant) => (
                  <div
                    key={participant.user_id}
                    className="flex flex-col items-center"
                  >
                    <div className="relative">
                      <div className="absolute inset-0 animate-pulse rounded-full bg-blue-500/20" />
                      <UserAvatar
                        user={participant.user}
                        size="xl"
                        className="relative"
                      />
                    </div>
                    <span className="mt-3 text-slate-200 font-medium">
                      {participant.user?.display_name || 'Participant'}
                    </span>
                    {participant.audio_muted && (
                      <span className="mt-1 text-xs text-red-400 flex items-center gap-1">
                        <MicOff className="h-3 w-3" /> Muted
                      </span>
                    )}
                  </div>
                ))}
              </div>
              {otherParticipants.length === 0 && (
                <span className="text-slate-400">
                  Waiting for others to join...
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4 py-6 bg-slate-800/50">
        <Button
          variant="ghost"
          size="icon-lg"
          onClick={handleToggleAudio}
          className={cn(
            'h-14 w-14 rounded-full',
            localMediaState.audioEnabled
              ? 'bg-slate-700 hover:bg-slate-600 text-white'
              : 'bg-red-600 hover:bg-red-700 text-white'
          )}
        >
          {localMediaState.audioEnabled ? (
            <Mic className="h-6 w-6" />
          ) : (
            <MicOff className="h-6 w-6" />
          )}
        </Button>

        {isVideoCall && (
          <>
            <Button
              variant="ghost"
              size="icon-lg"
              onClick={handleToggleVideo}
              className={cn(
                'h-14 w-14 rounded-full',
                localMediaState.videoEnabled
                  ? 'bg-slate-700 hover:bg-slate-600 text-white'
                  : 'bg-red-600 hover:bg-red-700 text-white'
              )}
            >
              {localMediaState.videoEnabled ? (
                <Video className="h-6 w-6" />
              ) : (
                <VideoOff className="h-6 w-6" />
              )}
            </Button>

            <Button
              variant="ghost"
              size="icon-lg"
              onClick={toggleScreenShare}
              className={cn(
                'h-14 w-14 rounded-full',
                localMediaState.screenShareEnabled
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-slate-700 hover:bg-slate-600 text-white'
              )}
            >
              <Monitor className="h-6 w-6" />
            </Button>
          </>
        )}

        <Button
          variant="destructive"
          size="icon-lg"
          onClick={handleEndCall}
          disabled={endCallMutation.isPending}
          className="h-14 w-14 rounded-full bg-red-600 hover:bg-red-700"
        >
          <PhoneOff className="h-6 w-6" />
        </Button>
      </div>
    </div>
  );
}
