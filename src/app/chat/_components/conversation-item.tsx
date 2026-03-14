'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { UserAvatar } from '@/components/shared/user-avatar';
import { cn, formatRelativeTime, getConversationAvatar, getConversationSubtitle, getConversationTitle, getOtherParticipant } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';
import type { Conversation } from '@/types';

interface ConversationItemProps {
  conversation: Conversation;
  isSelected: boolean;
}

export function ConversationItem({ conversation, isSelected }: ConversationItemProps) {
  const currentUserId = useAuthStore((state) => state.user?.id);
  const otherParticipant = useMemo(() => getOtherParticipant(conversation, currentUserId), [conversation, currentUserId]);
  const title = getConversationTitle(conversation, currentUserId);
  const subtitle = getConversationSubtitle(conversation, currentUserId);
  const href = `/chat?conversation=${conversation.id}`;

  return (
    <Link
      href={href}
      scroll={false}
      className={cn(
        'group block rounded-[22px] border px-3 py-3 transition-all duration-200',
        isSelected
          ? 'border-primary/35 bg-primary/8 shadow-[0_14px_40px_-28px_rgba(26,116,120,0.55)]'
          : 'border-transparent hover:border-border/70 hover:bg-background/55'
      )}
    >
      <div className="flex items-start gap-3">
        <UserAvatar
          src={getConversationAvatar(conversation, currentUserId)}
          alt={title}
          fallback={title[0]}
          size="md"
          showStatus={conversation.type === 'DM'}
          isOnline={otherParticipant?.is_online ?? false}
        />

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{title}</p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{subtitle}</p>
            </div>

            <div className="flex flex-col items-end gap-2">
              <span className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                {conversation.last_message_at ? formatRelativeTime(conversation.last_message_at) : 'New'}
              </span>
              {conversation.unread_count > 0 ? (
                <Badge className="rounded-full px-2 py-0 text-[11px]">
                  {conversation.unread_count > 99 ? '99+' : conversation.unread_count}
                </Badge>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

export function ConversationListSkeleton() {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: 8 }).map((_, index) => (
        <div key={index} className="flex items-center gap-3 rounded-[22px] border border-border/40 px-3 py-3">
          <Skeleton className="size-10 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}
