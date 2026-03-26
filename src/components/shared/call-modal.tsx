'use client';

import { useEffect, useMemo, useState } from 'react';
import { LoaderCircle, Phone, ShieldCheck, Video, X } from 'lucide-react';
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
import { getOtherParticipant } from '@/lib/utils';
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

  const otherParticipant = useMemo(
    () => (conversationQuery.data ? getOtherParticipant(conversationQuery.data, currentUserId) : null),
    [conversationQuery.data, currentUserId]
  );

  const canStart = conversationQuery.data?.type === 'DM' && Boolean(otherParticipant) && !starting && !activeCall;

  useEffect(() => {
    if (activeCall && activeCall.conversation_id === conversationId) {
      onClose();
    }
  }, [activeCall, conversationId, onClose]);

  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
    }
  }, [isOpen]);

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
      onClose();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Call could not be started.');
    } finally {
      setStarting(false);
    }
  };

  const resolvedName = recipientName ?? otherParticipant?.display_name ?? 'Contact';
  const subtitle = callType === 'VIDEO' ? 'Video call' : 'Voice call';
  const helperCopy =
    callType === 'VIDEO'
      ? 'Your camera and microphone will be used.'
      : 'Your microphone will be used.';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <DialogContent
        showCloseButton={false}
        className="overflow-hidden border-border bg-card p-0 shadow-xl sm:max-w-[420px]"
      >
        <DialogTitle className="sr-only">Start {subtitle.toLowerCase()}</DialogTitle>
        <DialogDescription className="sr-only">{resolvedName}</DialogDescription>

        <Card className="rounded-none border-0 bg-card py-0 shadow-none">
          <CardHeader className="relative items-center overflow-hidden px-6 pb-4 pt-6 text-center">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-primary/10 to-transparent" />

            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={onClose}
              className="absolute right-4 top-4 rounded-full"
              aria-label="Close call dialog"
            >
              <X className="h-4 w-4" />
            </Button>

            <Badge
              variant="secondary"
              className="mb-3 rounded-full px-3 py-1 text-[11px] uppercase tracking-wide"
            >
              {subtitle}
            </Badge>

            <div className="rounded-full border border-border bg-background/60 p-1 shadow-sm">
              <UserAvatar
                src={recipientAvatarUrl ?? otherParticipant?.avatar_url}
                alt={resolvedName}
                fallback={resolvedName[0] ?? 'C'}
                size="xl"
                className="h-24 w-24"
              />
            </div>
            <CardTitle className="mt-4 text-lg">{resolvedName}</CardTitle>
            <CardDescription className="text-sm">{starting ? 'Dialing...' : helperCopy}</CardDescription>
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
              onClick={onClose}
              className="h-11 min-w-[112px] rounded-full"
              aria-label="Cancel"
            >
              Cancel
            </Button>

            <Button
              type="button"
              onClick={handleStart}
              disabled={!canStart}
              className="h-11 min-w-[160px] rounded-full"
              aria-label={starting ? 'Starting call' : 'Start call'}
            >
              {starting ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : callType === 'VIDEO' ? (
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
