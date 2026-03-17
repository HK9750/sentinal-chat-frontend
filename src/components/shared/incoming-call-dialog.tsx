'use client';

import { useCallback, useMemo } from 'react';
import { Phone, PhoneOff, Video } from 'lucide-react';
import { useCallSignaling } from '@/hooks/use-call-signaling';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/shared/user-avatar';
import { getOtherParticipant } from '@/lib/utils';
import { useConversation } from '@/queries/use-conversation-queries';
import { useAuthStore } from '@/stores/auth-store';
import { useCallStore } from '@/stores/call-store';

export function IncomingCallDialog() {
  const currentUserId = useAuthStore((state) => state.user?.id);
  const incomingCall = useCallStore((state) => state.incomingCall);
  const setIncomingCall = useCallStore((state) => state.setIncomingCall);
  const setActiveCall = useCallStore((state) => state.setActiveCall);
  const resetCall = useCallStore((state) => state.resetCall);
  const { endCall } = useCallSignaling(incomingCall?.conversation_id);
  const conversationQuery = useConversation(incomingCall?.conversation_id);
  const otherParticipant = useMemo(
    () => (conversationQuery.data ? getOtherParticipant(conversationQuery.data, currentUserId) : null),
    [conversationQuery.data, currentUserId]
  );
  const callerName = otherParticipant?.display_name ?? otherParticipant?.username ?? 'Incoming caller';

  const handleDecline = useCallback(() => {
    if (incomingCall) {
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
      <DialogContent showCloseButton={false} className="border-border/70 bg-background/95 backdrop-blur-xl sm:max-w-md">
        <DialogHeader className="items-center space-y-4">
          <div className="relative">
            <div className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
            <UserAvatar size="xl" className="relative" src={otherParticipant?.avatar_url} alt={callerName} fallback={callerName[0] ?? 'C'} />
          </div>
          <div className="text-center">
            <DialogTitle className="text-xl text-foreground">Incoming call</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {incomingCall ? `${callerName} is calling you for a ${incomingCall.type === 'VIDEO' ? 'video' : 'voice'} chat.` : 'No active incoming call.'}
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
            className="h-16 w-16 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90"
          >
            {incomingCall?.type === 'VIDEO' ? <Video className="h-7 w-7" /> : <Phone className="h-7 w-7" />}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
