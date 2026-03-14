'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { CheckCheck } from 'lucide-react';
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
  const subtitle = conversation.last_message ? getMessagePreview(conversation.last_message as never) : getConversationSubtitle(conversation, currentUserId);
  const href = `/chat?conversation=${conversation.id}`;

  return (
    <Link
      href={href}
      scroll={false}
      className={cn(
        'group block rounded-none border-b border-border/60 px-3 py-3 transition-colors duration-150',
        isSelected
          ? 'bg-primary/10'
          : 'border-transparent hover:bg-muted/45'
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
              <p className="truncate text-[15px] font-medium text-foreground">{title}</p>
              <div className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                {conversation.last_message?.sender_id === currentUserId ? <CheckCheck className="size-3.5 text-primary/80" /> : null}
                <p className="truncate">{subtitle}</p>
              </div>
            </div>

            <div className="flex flex-col items-end gap-2">
              <span className="text-[11px] text-muted-foreground">
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
    <div className="space-y-0 p-0">
      {Array.from({ length: 8 }).map((_, index) => (
        <div key={index} className="flex items-center gap-3 border-b border-border/50 px-4 py-3">
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
