'use client';

import { useCallback, useState, useEffect } from 'react';
import { Phone, Video, PhoneOff, Loader2 } from 'lucide-react';
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
import { useCreateCall, useAddCallParticipant } from '@/queries/use-call-queries';
import { useConversationParticipants } from '@/queries/use-conversation-queries';
import { useAuthStore } from '@/stores/auth-store';
import { useWebRTC } from '@/hooks/use-webrtc';
import type { CallType } from '@/types/call';
import { cn } from '@/lib/utils';

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
  recipientName = 'Contact',
  recipientAvatarUrl,
}: CallModalProps) {
  const [callStatus, setCallStatus] = useState<'initiating' | 'ringing' | 'failed'>('initiating');

  const user = useAuthStore((state) => state.user);
  const initiateCall = useCallStore((state) => state.initiateCall);
  const setActiveCall = useCallStore((state) => state.setActiveCall);
  const setLocalStream = useCallStore((state) => state.setLocalStream);
  const resetCallState = useCallStore((state) => state.resetCallState);
  const uiState = useCallStore((state) => state.uiState);

  const { sendCallEnd } = useSocket();
  const createCallMutation = useCreateCall();
  const addParticipant = useAddCallParticipant();
  const { data: participants } = useConversationParticipants(conversationId);
  const { startCall, cleanup: cleanupWebRTC } = useWebRTC();

  // Find the other participant in this DM conversation
  const remoteParticipant = participants?.find((p) => p.user_id !== user?.id);
  const remoteUserId = remoteParticipant?.user_id;

  const handleInitiateCall = useCallback(async () => {
    if (!user || !remoteUserId) return;

    try {
      setCallStatus('initiating');
      initiateCall(conversationId, callType);

      // 1. Acquire local media
      const constraints: MediaStreamConstraints = {
        audio: true,
        video: callType === 'VIDEO',
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setLocalStream(stream);

      // 2. Create the call on the server
      const call = await createCallMutation.mutateAsync({
        conversation_id: conversationId,
        type: callType,
        initiator_id: user.id,
      });

      if (!call) {
        setCallStatus('failed');
        return;
      }

      setActiveCall(call);

      // 3. Add the remote user as a participant
      addParticipant.mutate({ callId: call.id, userId: remoteUserId });

      // 4. Create the WebRTC peer connection, generate offer, send via WS
      await startCall(call.id, remoteUserId, stream);

      setCallStatus('ringing');
    } catch (error) {
      console.error('Failed to initiate call:', error);
      setCallStatus('failed');
    }
  }, [
    user,
    remoteUserId,
    conversationId,
    callType,
    initiateCall,
    setLocalStream,
    setActiveCall,
    createCallMutation,
    addParticipant,
    startCall,
  ]);

  useEffect(() => {
    if (isOpen && remoteUserId) {
      handleInitiateCall();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, remoteUserId]);

  const handleCancel = useCallback(() => {
    const activeCall = useCallStore.getState().activeCall;
    if (activeCall) {
      sendCallEnd(activeCall.id, 'COMPLETED');
    }
    cleanupWebRTC();
    resetCallState();
    onClose();
  }, [sendCallEnd, cleanupWebRTC, resetCallState, onClose]);

  const handleRetry = useCallback(() => {
    cleanupWebRTC();
    setCallStatus('initiating');
    handleInitiateCall();
  }, [cleanupWebRTC, handleInitiateCall]);

  useEffect(() => {
    if (uiState === 'active') {
      onClose();
    }
  }, [uiState, onClose]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleCancel()}>
      <DialogContent
        showCloseButton={false}
        className="bg-background/95 border-border backdrop-blur-xl sm:max-w-md"
      >
        <DialogHeader className="items-center space-y-4">
          <div className="relative">
            {callStatus === 'ringing' && (
              <>
                <div className="absolute inset-0 animate-ping rounded-full bg-primary/30" />
                <div className="absolute inset-0 animate-pulse rounded-full bg-primary/20" />
              </>
            )}
            <UserAvatar
              user={{
                id: remoteUserId || 'recipient',
                display_name: recipientName,
                avatar_url: recipientAvatarUrl,
              }}
              size="xl"
              className="relative"
            />
          </div>

          <div className="text-center">
            <DialogTitle className="text-xl text-foreground">
              {recipientName}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground flex items-center justify-center gap-2">
              {callStatus === 'initiating' && (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Starting {callType === 'VIDEO' ? 'video' : 'voice'} call...
                </>
              )}
              {callStatus === 'ringing' && (
                <>
                  {callType === 'VIDEO' ? (
                    <Video className="h-4 w-4" />
                  ) : (
                    <Phone className="h-4 w-4" />
                  )}
                  Calling...
                </>
              )}
              {callStatus === 'failed' && (
                <span className="text-destructive">Call failed. Please try again.</span>
              )}
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="flex justify-center gap-6 pt-6">
          {callStatus === 'failed' ? (
            <>
              <Button
                variant="outline"
                onClick={handleCancel}
                className="border-input text-foreground"
              >
                Cancel
              </Button>
              <Button
                onClick={handleRetry}
                className={cn(
                  'bg-green-500 hover:bg-green-600',
                  'text-white'
                )}
              >
                {callType === 'VIDEO' ? (
                  <Video className="h-4 w-4 mr-2" />
                ) : (
                  <Phone className="h-4 w-4 mr-2" />
                )}
                Retry
              </Button>
            </>
          ) : (
            <Button
              variant="destructive"
              size="icon-lg"
              onClick={handleCancel}
              className={cn(
                'h-14 w-14 rounded-full',
                'bg-destructive hover:bg-destructive/90',
                'shadow-lg shadow-destructive/20'
              )}
            >
              <PhoneOff className="h-6 w-6" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
