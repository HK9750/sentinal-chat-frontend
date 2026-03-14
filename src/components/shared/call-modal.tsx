'use client';

import { Phone, Video } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { CallType } from '@/types';

interface CallModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId: string;
  callType: CallType;
  recipientName?: string;
  recipientAvatarUrl?: string;
}

export function CallModal({ isOpen, onClose, callType, recipientName = 'This conversation' }: CallModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="surface-panel max-w-md border-border/70">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl tracking-[-0.04em]">
            {callType === 'VIDEO' ? <Video className="size-5 text-primary" /> : <Phone className="size-5 text-primary" />}
            Calls are next in the rewrite
          </DialogTitle>
          <DialogDescription>
            The backend websocket call events exist, but the legacy call UI still targets the old store and mutation layer. I left the action visible so the route stays complete while the new call stack is rebuilt.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-[22px] border border-border/70 bg-background/55 px-4 py-4 text-sm text-muted-foreground">
          <p>
            Attempted target: <span className="font-medium text-foreground">{recipientName}</span>
          </p>
        </div>

        <div className="flex justify-end">
          <Button type="button" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
