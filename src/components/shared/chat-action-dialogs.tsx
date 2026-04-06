'use client';

import { useMemo } from 'react';
import { Clock3, PhoneCall, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { UserAvatar } from '@/components/shared/user-avatar';
import { formatRelativeTime, formatTimestamp } from '@/lib/utils';
import { useConversationCallHistory } from '@/queries/use-conversation-queries';
import type { Conversation, DisappearingMode } from '@/types';

interface ContactInfoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversation?: Conversation;
  title: string;
}

export function ContactInfoDialog({
  open,
  onOpenChange,
  conversation,
  title,
}: ContactInfoDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Contact info</DialogTitle>
          <DialogDescription>Members and chat details.</DialogDescription>
        </DialogHeader>

        {conversation ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-background p-4">
              <div className="flex items-center gap-3">
                <UserAvatar
                  src={conversation.avatar_url}
                  alt={title}
                  fallback={title[0]}
                  size="lg"
                />
                <div>
                  <p className="text-sm font-semibold text-foreground">{title}</p>
                  <p className="text-xs text-muted-foreground">
                    {conversation.type === 'DM'
                      ? 'Direct chat'
                      : `${conversation.participants.length} participants`}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-background">
              <div className="border-b border-border px-4 py-3">
                <p className="text-sm font-semibold text-foreground">Participants</p>
              </div>
              <ScrollArea className="max-h-64">
                <div className="space-y-2 p-3">
                  {conversation.participants.map((participant) => (
                    <div
                      key={participant.user_id}
                      className="flex items-center justify-between gap-3 rounded-lg px-2 py-2"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <UserAvatar
                          src={participant.avatar_url}
                          alt={participant.display_name}
                          fallback={participant.display_name[0] ?? 'U'}
                          size="md"
                          showStatus
                          isOnline={participant.is_online}
                        />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">
                            {participant.display_name}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            @{participant.username || 'member'}
                          </p>
                        </div>
                      </div>
                      <Badge variant="secondary" className="text-[10px] uppercase">
                        {participant.role}
                      </Badge>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

interface DisappearingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: DisappearingMode;
  pending: boolean;
  onSelectMode: (mode: DisappearingMode) => void;
}

const DISAPPEARING_OPTIONS: Array<{ label: string; value: DisappearingMode; hint: string }> = [
  { label: 'Off', value: 'OFF', hint: 'Messages stay unless manually deleted.' },
  { label: '24 hours', value: '24_HOURS', hint: 'New messages auto-clear after 24 hours.' },
  { label: '7 days', value: '7_DAYS', hint: 'New messages auto-clear after 7 days.' },
  { label: '90 days', value: '90_DAYS', hint: 'New messages auto-clear after 90 days.' },
];

export function DisappearingMessagesDialog({
  open,
  onOpenChange,
  value,
  pending,
  onSelectMode,
}: DisappearingDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Disappearing messages</DialogTitle>
          <DialogDescription>
            Applies to new messages in this chat.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          {DISAPPEARING_OPTIONS.map((option) => {
            const active = option.value === value;

            return (
              <button
                key={option.value}
                type="button"
                disabled={pending}
                onClick={() => onSelectMode(option.value)}
                className={`w-full rounded-xl border px-3 py-3 text-left transition-colors ${
                  active
                    ? 'border-primary/40 bg-primary/10'
                    : 'border-border bg-background hover:bg-muted/40'
                }`}
              >
                <p className="text-sm font-medium text-foreground">{option.label}</p>
                <p className="mt-1 text-xs text-muted-foreground">{option.hint}</p>
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  confirmVariant?: 'default' | 'destructive';
  pending: boolean;
  onConfirm: () => void;
}

export function ConfirmActionDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  confirmVariant = 'default',
  pending,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            variant={confirmVariant}
            disabled={pending}
            onClick={onConfirm}
          >
            {pending ? 'Please wait...' : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface CallHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: string;
}

export function CallHistoryDialog({
  open,
  onOpenChange,
  conversationId,
}: CallHistoryDialogProps) {
  const historyQuery = useConversationCallHistory(open ? conversationId : null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Call history</DialogTitle>
          <DialogDescription>Recent voice/video calls in this chat.</DialogDescription>
        </DialogHeader>

        <div className="rounded-xl border border-border bg-background">
          <ScrollArea className="max-h-96">
            {historyQuery.isLoading ? (
              <div className="p-6 text-center text-sm text-muted-foreground">Loading call history...</div>
            ) : historyQuery.isError ? (
              <div className="p-6 text-center text-sm text-destructive">Unable to load call history.</div>
            ) : (historyQuery.data?.items.length ?? 0) === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">No calls yet.</div>
            ) : (
              <div className="divide-y divide-border">
                {historyQuery.data?.items.map((item) => (
                  <div key={item.id} className="flex items-start justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                        <PhoneCall className="h-4 w-4 text-primary" />
                        {item.type === 'VIDEO' ? 'Video call' : 'Voice call'}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {item.started_at ? formatRelativeTime(item.started_at) : '-'}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {item.end_reason ? `Ended: ${item.end_reason}` : 'In progress'}
                      </p>
                    </div>

                    <div className="shrink-0 text-right text-xs text-muted-foreground">
                      <p>{item.duration_seconds ? `${item.duration_seconds}s` : '-'}</p>
                      <p>{item.ended_at ? formatTimestamp(item.ended_at) : ''}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface SelectionToolbarProps {
  selectedCount: number;
  canDeleteForEveryone: boolean;
  pending: boolean;
  onCancel: () => void;
  onDeleteForMe: () => void;
  onDeleteForEveryone: () => void;
}

export function MessageSelectionToolbar({
  selectedCount,
  canDeleteForEveryone,
  pending,
  onCancel,
  onDeleteForMe,
  onDeleteForEveryone,
}: SelectionToolbarProps) {
  const title = useMemo(
    () => `${selectedCount} selected`,
    [selectedCount]
  );

  return (
    <div className="flex items-center justify-between gap-3 border-b border-border bg-card px-4 py-2">
      <div className="flex items-center gap-2">
        <Clock3 className="h-4 w-4 text-muted-foreground" />
        <p className="text-sm font-medium text-foreground">{title}</p>
      </div>

      <div className="flex items-center gap-2">
        <Button type="button" size="sm" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="button" size="sm" variant="secondary" onClick={onDeleteForMe} disabled={pending}>
          <Trash2 className="h-4 w-4" />
          Delete for me
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" size="sm" variant="destructive" disabled={pending}>
              Delete options
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem onClick={onDeleteForMe}>Delete for me</DropdownMenuItem>
            <DropdownMenuItem
              disabled={!canDeleteForEveryone}
              onClick={onDeleteForEveryone}
              className={!canDeleteForEveryone ? 'opacity-60' : ''}
            >
              Delete for everyone
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
