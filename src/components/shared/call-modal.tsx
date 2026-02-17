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
import { useCreateCall } from '@/queries/use-call-queries';
import { useAuthStore } from '@/stores/auth-store';
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

  const { sendCallOffer, sendCallEnd } = useSocket();
  const createCallMutation = useCreateCall();

  const handleInitiateCall = useCallback(async () => {
    if (!user) return;

    try {
      setCallStatus('initiating');
      initiateCall(conversationId, callType);

      // Get user media first
      const constraints: MediaStreamConstraints = {
        audio: true,
        video: callType === 'VIDEO',
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setLocalStream(stream);

      // Create call via API
      const call = await createCallMutation.mutateAsync({
        conversation_id: conversationId,
        type: callType,
        initiator_id: user.id,
      });

      if (call) {
        setActiveCall(call);
        setCallStatus('ringing');
        
        // The actual WebRTC offer would be created here and sent via socket
        // For now, we'll handle this in a separate WebRTC manager
      }
    } catch (error) {
      console.error('Failed to initiate call:', error);
      setCallStatus('failed');
    }
  }, [
    user,
    conversationId,
    callType,
    initiateCall,
    setLocalStream,
    setActiveCall,
    createCallMutation,
  ]);

  // Start call when modal opens
  useEffect(() => {
    if (isOpen) {
      handleInitiateCall();
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCancel = useCallback(() => {
    const activeCall = useCallStore.getState().activeCall;
    if (activeCall) {
      sendCallEnd(activeCall.id, 'COMPLETED');
    }
    resetCallState();
    onClose();
  }, [sendCallEnd, resetCallState, onClose]);

  const handleRetry = useCallback(() => {
    setCallStatus('initiating');
    handleInitiateCall();
  }, [handleInitiateCall]);

  // Close modal when call connects (uiState changes to 'active')
  useEffect(() => {
    if (uiState === 'active') {
      onClose();
    }
  }, [uiState, onClose]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleCancel()}>
      <DialogContent
        showCloseButton={false}
        className="bg-slate-900/95 border-slate-700 backdrop-blur-xl sm:max-w-md"
      >
        <DialogHeader className="items-center space-y-4">
          <div className="relative">
            {callStatus === 'ringing' && (
              <>
                <div className="absolute inset-0 animate-ping rounded-full bg-blue-500/30" />
                <div className="absolute inset-0 animate-pulse rounded-full bg-blue-500/20" />
              </>
            )}
            <UserAvatar
              user={{
                id: 'recipient',
                display_name: recipientName,
                avatar_url: recipientAvatarUrl,
              }}
              size="xl"
              className="relative"
            />
          </div>
          
          <div className="text-center">
            <DialogTitle className="text-xl text-slate-100">
              {recipientName}
            </DialogTitle>
            <DialogDescription className="text-slate-400 flex items-center justify-center gap-2">
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
                <span className="text-red-400">Call failed. Please try again.</span>
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
                className="border-slate-600 text-slate-300"
              >
                Cancel
              </Button>
              <Button
                onClick={handleRetry}
                className={cn(
                  'bg-emerald-600 hover:bg-emerald-700',
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
                'bg-red-600 hover:bg-red-700',
                'shadow-lg shadow-red-900/50'
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
