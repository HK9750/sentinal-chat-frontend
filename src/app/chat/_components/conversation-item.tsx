'use client';

import { cn, formatRelativeTime } from '@/lib/utils';
import { UserAvatar } from '@/components/shared/user-avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Conversation } from '@/types';

interface ConversationItemProps {
    conversation: Conversation;
    isSelected: boolean;
    onClick: () => void;
}

export function ConversationItem({ conversation, isSelected, onClick }: ConversationItemProps) {
    const hasUnread = (conversation.unread_count ?? 0) > 0;

    return (
        <button
            onClick={onClick}
            className={cn(
                'w-full p-4 flex items-center gap-3 transition-all duration-200 text-left',
                isSelected
                    ? 'bg-accent border-l-4 border-primary'
                    : 'hover:bg-muted/50 border-l-4 border-transparent'
            )}
        >
            <UserAvatar
                src={conversation.avatar_url}
                alt={conversation.subject}
                fallback={conversation.type === 'DM' ? 'DM' : conversation.subject?.[0] || 'G'}
                size="md"
            />

            <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start gap-2">
                    <h3 className="text-sm font-medium text-foreground truncate">
                        {conversation.subject || (conversation.type === 'DM' ? 'Direct Message' : 'Group Chat')}
                    </h3>
                    {conversation.last_message_at && (
                        <span className="text-xs text-muted-foreground shrink-0">
                            {formatRelativeTime(conversation.last_message_at)}
                        </span>
                    )}
                </div>
                <p className="text-sm text-muted-foreground truncate mt-0.5">
                    {conversation.last_message?.content || conversation.description || 'No messages yet'}
                </p>
            </div>

            {hasUnread && (
                <Badge variant="default" className="shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground text-xs px-2 py-0.5">
                    {conversation.unread_count! > 99 ? '99+' : conversation.unread_count}
                </Badge>
            )}
        </button>
    );
}

export function ConversationListSkeleton() {
    return (
        <div className="space-y-3 p-4">
            {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                    </div>
                </div>
            ))}
        </div>
    );
}
