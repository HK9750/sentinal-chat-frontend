'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { CheckCheck, LockKeyhole, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { UserAvatar } from '@/components/shared/user-avatar';
import {
  cn,
  formatRelativeTime,
  getConversationAvatar,
  getConversationSubtitle,
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
  const otherParticipant = useMemo(() => getOtherParticipant(conversation, currentUserId), [conversation, currentUserId]);
  const title = getConversationTitle(conversation, currentUserId);
  const subtitle = conversation.last_message ? getMessagePreview(conversation.last_message) : getConversationSubtitle(conversation, currentUserId);
  const href = `/chat?conversation=${conversation.id}`;

  return (
    <Link
      href={href}
      scroll={false}
      className={cn(
        'group block rounded-[24px] border px-3 py-3.5 transition-all duration-200',
        isSelected
          ? 'border-primary/20 bg-primary/10 shadow-sm'
          : 'border-transparent bg-background/40 hover:border-border hover:bg-background hover:shadow-sm'
      )}
    >
      <div className="flex items-start gap-3">
        <UserAvatar
          src={getConversationAvatar(conversation, currentUserId)}
          alt={title}
          fallback={title[0]}
          size="lg"
          showStatus={conversation.type === 'DM'}
          isOnline={otherParticipant?.is_online ?? false}
        />

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="truncate text-[15px] font-semibold text-foreground">{title}</p>
                <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  {conversation.type === 'DM' ? <LockKeyhole className="size-3" /> : <Users className="size-3" />}
                  {conversation.type === 'DM' ? 'Direct' : 'Group'}
                </span>
              </div>
              <div className="mt-1.5 flex items-center gap-1.5 text-sm text-muted-foreground">
                {conversation.last_message?.sender_id === currentUserId ? <CheckCheck className="size-3.5 text-primary/80" /> : null}
                <p className="truncate">{subtitle}</p>
              </div>
            </div>

            <div className="flex flex-col items-end gap-2">
              <span className="text-[11px] font-medium text-muted-foreground">
                {conversation.last_message_at ? formatRelativeTime(conversation.last_message_at) : 'New'}
              </span>
              {conversation.unread_count > 0 ? (
                <Badge className="rounded-full bg-primary px-2 py-0 text-[11px] text-primary-foreground shadow-none">
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
    <div className="space-y-2 p-3">
      {Array.from({ length: 8 }).map((_, index) => (
        <div key={index} className="flex items-center gap-3 rounded-[24px] border border-border bg-card px-4 py-3">
          <Skeleton className="size-12 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}
