'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { Check, CheckCheck } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { UserAvatar } from '@/components/shared/user-avatar';
import {
  cn,
  formatRelativeTime,
  getConversationAvatar,
  getConversationTitle,
  getMessagePreview,
  getOtherParticipant,
} from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';
import type { Conversation } from '@/types';

interface ConversationItemProps {
  conversation: Conversation;
  isSelected: boolean;
}

export function ConversationItem({ conversation, isSelected }: ConversationItemProps) {
  const currentUserId = useAuthStore((state) => state.user?.id);
  const otherParticipant = useMemo(
    () => getOtherParticipant(conversation, currentUserId),
    [conversation, currentUserId]
  );
  const title = getConversationTitle(conversation, currentUserId);
  const subtitle = conversation.last_message
    ? getMessagePreview(conversation.last_message)
    : conversation.type === 'GROUP'
      ? `${conversation.participants?.length ?? 0} participants`
      : 'No messages yet';
  const href = `/chat?conversation=${conversation.id}`;
  const lastMessage = conversation.last_message ?? null;

  const lastMessageReceiptIcon = useMemo(() => {
    if (!lastMessage || lastMessage.sender_id !== currentUserId) return null;

    if (lastMessage.client_status === 'PENDING') {
      return <span className="text-[11px] font-bold text-muted-foreground/70">•••</span>;
    }
    if (lastMessage.client_status === 'FAILED') {
      return <span className="text-[12px] font-bold text-destructive">!</span>;
    }

    if (!lastMessage.receipt_status || lastMessage.receipt_status === 'SENT') {
      return <Check strokeWidth={2.5} className="mt-[1px] h-[15px] w-[15px] text-muted-foreground/70" />;
    }

    return (
      <CheckCheck
        strokeWidth={2.5}
        className={cn(
          'mt-[1px] h-[15px] w-[15px]',
          lastMessage.receipt_status === 'READ' || lastMessage.receipt_status === 'PLAYED'
            ? 'text-primary'
            : 'text-muted-foreground/70'
        )}
      />
    );
  }, [currentUserId, lastMessage]);

  const isUnread = conversation.unread_count > 0;
  const hasNewMessages = isUnread && lastMessage?.sender_id !== currentUserId;

  return (
    <Link
      href={href}
      scroll={false}
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-accent',
        isSelected && 'bg-sidebar '
      )}
    >
      {/* Avatar */}
      <UserAvatar
        src={getConversationAvatar(conversation, currentUserId)}
        alt={title}
        fallback={title[0]}
        size="lg"
        showStatus={conversation.type === 'DM'}
        isOnline={otherParticipant?.is_online ?? false}
      />

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-[16px] font-normal text-foreground">{title}</span>
          <span
            className={cn(
              'shrink-0 text-[12px]',
              hasNewMessages ? 'font-medium text-primary' : 'text-muted-foreground '
            )}
          >
            {conversation.last_message_at
              ? formatRelativeTime(conversation.last_message_at)
              : ''}
          </span>
        </div>

        <div className="mt-0.5 flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1 text-[14px] text-muted-foreground ">
            {lastMessageReceiptIcon}
            <span className="truncate">{subtitle}</span>
          </div>

          {isUnread && (
            <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-medium text-primary-foreground">
              {conversation.unread_count > 99 ? '99+' : conversation.unread_count}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

export function ConversationListSkeleton() {
  return (
    <div className="divide-y divide-border">
      {Array.from({ length: 8 }).map((_, index) => (
        <div key={index} className="flex items-center gap-3 px-3 py-3">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}
