'use client';

import { useCallback, useMemo } from 'react';
import { Phone, PhoneOff, ShieldCheck, Video, Volume2 } from 'lucide-react';
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
      <DialogContent
        showCloseButton={false}
        className="overflow-hidden border-border bg-card p-0 shadow-xl sm:max-w-[420px]"
      >
        <DialogTitle className="sr-only">Incoming call</DialogTitle>
        <DialogDescription className="sr-only">{callerName}</DialogDescription>

        <Card className="rounded-none border-0 bg-card py-0 shadow-none">
          <CardHeader className="items-center overflow-hidden px-6 pb-4 pt-6 text-center">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-primary/10 to-transparent" />

            <Badge
              variant="secondary"
              className="mb-3 rounded-full px-3 py-1 text-[11px] uppercase tracking-wide"
            >
              Incoming call
            </Badge>

            <div className="relative mt-1">
              <span className="absolute inset-0 animate-ping rounded-full bg-primary/30" />
              <div className="rounded-full border border-border bg-background/60 p-1 shadow-sm">
                <UserAvatar
                  size="xl"
                  className="relative h-24 w-24"
                  src={otherParticipant?.avatar_url}
                  alt={callerName}
                  fallback={callerName[0] ?? 'C'}
                />
              </div>
            </div>

            <CardTitle className="mt-4 text-lg">{callerName}</CardTitle>
            <CardDescription className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
              <Volume2 className="h-3.5 w-3.5" />
              Ringing...
            </CardDescription>
          </CardHeader>

          <Separator />

          <CardContent className="space-y-3 px-6 py-4 text-center">
            <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
              End-to-end encrypted
            </p>
          </CardContent>

          <CardFooter className="justify-center gap-3 px-6 pb-6 pt-1">
            <Button
              type="button"
              variant="destructive"
              onClick={handleDecline}
              className="h-11 min-w-[112px] rounded-full"
              aria-label="Decline call"
            >
              <PhoneOff className="h-4 w-4" />
              Decline
            </Button>

            <Button
              type="button"
              onClick={handleAccept}
              className="h-11 min-w-[160px] rounded-full"
              aria-label="Accept call"
            >
              {incomingCall?.type === 'VIDEO' ? <Video className="h-4 w-4" /> : <Phone className="h-4 w-4" />}
              Accept
            </Button>
          </CardFooter>
        </Card>
      </DialogContent>
    </Dialog>
  );
}
