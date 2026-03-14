'use client';

import { useMemo } from 'react';
import { ArrowLeft, Phone, Search, Video } from 'lucide-react';
import { UserAvatar } from '@/components/shared/user-avatar';
import { Button } from '@/components/ui/button';
import { getConversationTitle, getOtherParticipant } from '@/lib/utils';
import { useConversation } from '@/queries/use-conversation-queries';
import { useAuthStore } from '@/stores/auth-store';
import { useChatStore } from '@/stores/chat-store';
import type { CallType } from '@/types';

interface ChatHeaderProps {
  conversationId: string;
  onBack?: () => void;
  onStartCall: (callType: CallType) => void;
  onOpenSearch: () => void;
}

export function ChatHeader({ conversationId, onBack, onStartCall, onOpenSearch }: ChatHeaderProps) {
  const conversationQuery = useConversation(conversationId);
  const currentUserId = useAuthStore((state) => state.user?.id);
  const typingByConversation = useChatStore((state) => state.typingByConversation);
  const typingUserIds = Object.keys(typingByConversation[conversationId] ?? {});

  const conversation = conversationQuery.data;
  const otherParticipant = conversation ? getOtherParticipant(conversation, currentUserId) : null;
  const title = conversation ? getConversationTitle(conversation, currentUserId) : 'Conversation';

  const subtitle = useMemo(() => {
    if (!conversation) {
      return 'Loading conversation...';
    }

    if (typingUserIds.length > 0) {
      return typingUserIds.length === 1 ? 'Someone is typing...' : `${typingUserIds.length} people are typing...`;
    }

    if (conversation.type === 'DM') {
      return otherParticipant?.is_online ? 'Online now' : 'Encrypted direct message';
    }

    return `${conversation.participants.length} participant${conversation.participants.length === 1 ? '' : 's'}`;
  }, [conversation, otherParticipant?.is_online, typingUserIds.length]);

  return (
    <div className="flex h-18 items-center justify-between border-b border-border/70 px-4">
      <div className="flex min-w-0 items-center gap-3">
        {onBack ? (
          <Button type="button" variant="ghost" size="icon" className="lg:hidden" onClick={onBack}>
            <ArrowLeft className="size-4" />
          </Button>
        ) : null}

        <UserAvatar
          src={conversation?.avatar_url ?? otherParticipant?.avatar_url}
          alt={title}
          fallback={title[0]}
          size="md"
          showStatus={conversation?.type === 'DM'}
          isOnline={otherParticipant?.is_online ?? false}
        />

        <div className="min-w-0">
          <p className="truncate text-base font-semibold tracking-[-0.03em]">{title}</p>
          <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <Button type="button" variant="ghost" size="icon" onClick={onOpenSearch}>
          <Search className="size-4" />
        </Button>
        <Button type="button" variant="ghost" size="icon" onClick={() => onStartCall('AUDIO')}>
          <Phone className="size-4" />
        </Button>
        <Button type="button" variant="ghost" size="icon" onClick={() => onStartCall('VIDEO')}>
          <Video className="size-4" />
        </Button>
      </div>
    </div>
  );
}
