'use client';

import { useCallback } from 'react';
import { Phone, PhoneOff, Video } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/shared/user-avatar';
import { useCallStore } from '@/stores/call-store';

export function IncomingCallDialog() {
  const incomingCall = useCallStore((state) => state.incomingCall);
  const setIncomingCall = useCallStore((state) => state.setIncomingCall);
  const setActiveCall = useCallStore((state) => state.setActiveCall);
  const resetCall = useCallStore((state) => state.resetCall);

  const handleDecline = useCallback(() => {
    resetCall();
  }, [resetCall]);

  const handleAccept = useCallback(() => {
    if (!incomingCall) {
      return;
    }

    setActiveCall({
      call_id: incomingCall.call_id,
      conversation_id: incomingCall.conversation_id,
      type: incomingCall.type,
      initiator_id: incomingCall.initiated_by,
      started_at: incomingCall.started_at,
      status: 'connecting',
    });
    setIncomingCall(null);
  }, [incomingCall, setActiveCall, setIncomingCall]);

  return (
    <Dialog open={Boolean(incomingCall)} onOpenChange={(open) => (!open ? handleDecline() : undefined)}>
      <DialogContent showCloseButton={false} className="border-border/70 bg-background/95 backdrop-blur-xl sm:max-w-md">
        <DialogHeader className="items-center space-y-4">
          <div className="relative">
            <div className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
            <UserAvatar size="xl" className="relative" user={{ display_name: 'Incoming caller' }} />
          </div>
          <div className="text-center">
            <DialogTitle className="text-xl text-foreground">Incoming encrypted call</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {incomingCall ? `A ${incomingCall.type === 'VIDEO' ? 'video' : 'voice'} call is waiting.` : 'No active incoming call.'}
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="flex justify-center gap-8 pt-6">
          <Button
            variant="destructive"
            size="icon-lg"
            onClick={handleDecline}
            className="h-16 w-16 rounded-full shadow-lg shadow-destructive/20"
          >
            <PhoneOff className="h-7 w-7" />
          </Button>

          <Button
            size="icon-lg"
            onClick={handleAccept}
            className="h-16 w-16 rounded-full bg-green-500 text-white shadow-lg shadow-green-500/20 hover:bg-green-600"
          >
            {incomingCall?.type === 'VIDEO' ? <Video className="h-7 w-7" /> : <Phone className="h-7 w-7" />}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
