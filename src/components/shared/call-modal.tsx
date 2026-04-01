'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Camera,
  CameraOff,
  LoaderCircle,
  Mic,
  MicOff,
  Phone,
  ShieldCheck,
  Video,
  X,
} from 'lucide-react';
import { UserAvatar } from '@/components/shared/user-avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { useCallSignaling } from '@/hooks/use-call-signaling';
import { useConversation } from '@/queries/use-conversation-queries';
import { useCallStore } from '@/stores/call-store';
import { useAuthStore } from '@/stores/auth-store';
import { cn, getOtherParticipant } from '@/lib/utils';
import type { CallType } from '@/types';

interface CallModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId: string;
  callType: CallType;
  recipientName?: string;
  recipientAvatarUrl?: string;
}

export function CallModal({
  isOpen,
  onClose,
  conversationId,
  callType,
  recipientName,
  recipientAvatarUrl,
}: CallModalProps) {
  const currentUserId = useAuthStore((state) => state.user?.id);
  const activeCall = useCallStore((state) => state.activeCall);
  const setActiveCall = useCallStore((state) => state.setActiveCall);
  const conversationQuery = useConversation(conversationId);
  const { startCall } = useCallSignaling(conversationId);
  
  const [starting, setStarting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  
  const videoPreviewRef = useRef<HTMLVideoElement>(null);

  const otherParticipant = useMemo(
    () => (conversationQuery.data ? getOtherParticipant(conversationQuery.data, currentUserId) : null),
    [conversationQuery.data, currentUserId]
  );

  const canStart = conversationQuery.data?.type === 'DM' && Boolean(otherParticipant) && !starting && !activeCall;

  // Setup camera preview for video calls
  useEffect(() => {
    if (!isOpen) {
      // Cleanup stream when modal closes
      if (previewStream) {
        previewStream.getTracks().forEach((track) => track.stop());
        setPreviewStream(null);
      }
      return;
    }

    if (callType !== 'VIDEO') {
      return;
    }

    let mounted = true;

    const setupPreview = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
          audio: true,
        });
        
        if (mounted) {
          setPreviewStream(stream);
          setErrorMessage(null);
        } else {
          stream.getTracks().forEach((track) => track.stop());
        }
      } catch (error) {
        if (mounted) {
          if (error instanceof DOMException) {
            if (error.name === 'NotAllowedError') {
              setErrorMessage('Camera/microphone access denied. Please grant permissions.');
            } else if (error.name === 'NotFoundError') {
              setErrorMessage('No camera or microphone found.');
            } else {
              setErrorMessage('Could not access camera/microphone.');
            }
          }
        }
      }
    };

    void setupPreview();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- previewStream is intentionally excluded to avoid stopping the stream on re-renders
  }, [isOpen, callType]);

  // Attach preview stream to video element
  useEffect(() => {
    if (videoPreviewRef.current && previewStream) {
      videoPreviewRef.current.srcObject = previewStream;
    }
  }, [previewStream]);

  // Toggle microphone in preview
  const toggleMic = useCallback(() => {
    if (previewStream) {
      previewStream.getAudioTracks().forEach((track) => {
        track.enabled = !micEnabled;
      });
    }
    setMicEnabled(!micEnabled);
  }, [previewStream, micEnabled]);

  // Toggle camera in preview
  const toggleCamera = useCallback(() => {
    if (previewStream) {
      previewStream.getVideoTracks().forEach((track) => {
        track.enabled = !cameraEnabled;
      });
    }
    setCameraEnabled(!cameraEnabled);
  }, [previewStream, cameraEnabled]);

  // Clean up on unmount or close
  useEffect(() => {
    return () => {
      if (previewStream) {
        previewStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [previewStream]);

  useEffect(() => {
    if (activeCall && activeCall.conversation_id === conversationId) {
      onClose();
    }
  }, [activeCall, conversationId, onClose]);

  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      setMicEnabled(true);
      setCameraEnabled(true);
    }
  }, [isOpen]);

  const handleClose = useCallback(() => {
    if (previewStream) {
      previewStream.getTracks().forEach((track) => track.stop());
      setPreviewStream(null);
    }
    onClose();
  }, [previewStream, onClose]);

  const handleStart = async () => {
    if (!canStart || !conversationQuery.data || !otherParticipant) {
      return;
    }

    try {
      setStarting(true);
      setErrorMessage(null);
      const payload = await startCall(callType);
      if (!payload?.call_id) {
        return;
      }

      // Stop preview stream - the call will create its own stream
      if (previewStream) {
        previewStream.getTracks().forEach((track) => track.stop());
        setPreviewStream(null);
      }

      setActiveCall({
        call_id: payload.call_id,
        conversation_id: conversationId,
        type: callType,
        initiator_id: currentUserId,
        peer_user_id: otherParticipant.user_id,
        started_at: payload.started_at,
        status: 'outgoing',
        participant_ids: payload.participant_ids,
      });
      handleClose();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Call could not be started.');
    } finally {
      setStarting(false);
    }
  };

  const resolvedName = recipientName ?? otherParticipant?.display_name ?? 'Contact';
  const subtitle = callType === 'VIDEO' ? 'Video call' : 'Voice call';
  const isVideoCall = callType === 'VIDEO';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => (!open ? handleClose() : undefined)}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          "overflow-hidden border-border bg-card p-0 shadow-xl",
          isVideoCall ? "sm:max-w-[520px]" : "sm:max-w-[420px]"
        )}
      >
        <DialogTitle className="sr-only">Start {subtitle.toLowerCase()}</DialogTitle>
        <DialogDescription className="sr-only">{resolvedName}</DialogDescription>

        <Card className="rounded-none border-0 bg-card py-0 shadow-none">
          <CardHeader className="relative items-center overflow-hidden px-6 pb-4 pt-6 text-center">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-primary/10 to-transparent" />

            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={handleClose}
              className="absolute right-4 top-4 z-10 rounded-full"
              aria-label="Close call dialog"
            >
              <X className="h-4 w-4" />
            </Button>

            <Badge
              variant={isVideoCall ? "default" : "secondary"}
              className={cn(
                "mb-4 gap-1.5 rounded-full px-3 py-1.5 text-[11px] uppercase tracking-wide",
                isVideoCall && "bg-primary text-primary-foreground"
              )}
            >
              {isVideoCall ? <Video className="h-3.5 w-3.5" /> : <Phone className="h-3.5 w-3.5" />}
              {subtitle}
            </Badge>

            {/* Video Preview or Avatar */}
            {isVideoCall ? (
              <div className="relative w-full max-w-[280px] overflow-hidden rounded-xl bg-muted shadow-lg">
                <div className="aspect-[4/3]">
                  {previewStream && cameraEnabled ? (
                    <video
                      ref={videoPreviewRef}
                      autoPlay
                      playsInline
                      muted
                      className="h-full w-full scale-x-[-1] object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-muted">
                      <UserAvatar
                        src={undefined}
                        alt="You"
                        fallback="You"
                        size="lg"
                        className="h-16 w-16"
                      />
                      <span className="text-xs text-muted-foreground">
                        {!previewStream ? 'Loading camera...' : 'Camera off'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Preview controls */}
                <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-2">
                  <Button
                    type="button"
                    size="icon"
                    variant={micEnabled ? "secondary" : "destructive"}
                    className="h-9 w-9 rounded-full shadow-md"
                    onClick={toggleMic}
                  >
                    {micEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant={cameraEnabled ? "secondary" : "destructive"}
                    className="h-9 w-9 rounded-full shadow-md"
                    onClick={toggleCamera}
                  >
                    {cameraEnabled ? <Camera className="h-4 w-4" /> : <CameraOff className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="relative">
                <div className="rounded-full border border-border bg-background/60 p-1 shadow-sm">
                  <UserAvatar
                    src={recipientAvatarUrl ?? otherParticipant?.avatar_url}
                    alt={resolvedName}
                    fallback={resolvedName[0] ?? 'C'}
                    size="xl"
                    className="h-24 w-24"
                  />
                </div>
              </div>
            )}

            <CardTitle className="mt-4 text-lg">{resolvedName}</CardTitle>
            <CardDescription className="text-sm">
              {starting ? 'Dialing...' : isVideoCall ? 'Check your camera and mic before calling' : 'Your microphone will be used'}
            </CardDescription>
          </CardHeader>

          <Separator />

          <CardContent className="space-y-3 px-6 py-4 text-center">
            <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
              End-to-end encrypted
            </p>

            {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}
          </CardContent>

          <CardFooter className="justify-center gap-3 px-6 pb-6 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="h-11 min-w-[112px] rounded-full"
              aria-label="Cancel"
            >
              Cancel
            </Button>

            <Button
              type="button"
              onClick={handleStart}
              disabled={!canStart}
              className={cn(
                "h-11 min-w-[160px] rounded-full gap-2",
                "bg-green-500 hover:bg-green-600 text-white"
              )}
              aria-label={starting ? 'Starting call' : 'Start call'}
            >
              {starting ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : isVideoCall ? (
                <Video className="h-4 w-4" />
              ) : (
                <Phone className="h-4 w-4" />
              )}
              {starting ? 'Calling...' : 'Start call'}
            </Button>
          </CardFooter>
        </Card>
      </DialogContent>
    </Dialog>
  );
}
