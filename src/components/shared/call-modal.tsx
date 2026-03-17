'use client';

import { useEffect, useMemo, useState } from 'react';
import { Phone, Video } from 'lucide-react';
import { UserAvatar } from '@/components/shared/user-avatar';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <DialogContent className="border-border/70 bg-background/95 backdrop-blur-xl sm:max-w-md">
        <DialogHeader className="items-center space-y-4 text-center">
          <UserAvatar src={recipientAvatarUrl} alt={recipientName} fallback={recipientName?.[0] ?? 'C'} size="xl" />
          <div>
            <DialogTitle className="text-xl text-foreground">
              Start {callType === 'VIDEO' ? 'video' : 'voice'} call
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {recipientName ?? otherParticipant?.display_name ?? 'This contact'} will receive a ringing call in this direct chat.
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="flex items-center justify-center gap-4 pt-4">
          <Button type="button" variant="outline" onClick={onClose} className="rounded-full px-6">
            Cancel
          </Button>
          <Button type="button" onClick={handleStart} disabled={!canStart} className="rounded-full px-6">
            {callType === 'VIDEO' ? <Video className="size-4" /> : <Phone className="size-4" />}
            {starting ? 'Calling...' : 'Start call'}
          </Button>
        </div>

        {errorMessage ? <p className="text-center text-sm text-destructive">{errorMessage}</p> : null}
      </DialogContent>
    </Dialog>
  );
}
