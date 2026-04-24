'use client';

import { useMemo } from 'react';
import { ArrowLeft, MoreVertical, Phone, Redo2, Search, Undo2, Video } from 'lucide-react';
import { UserAvatar } from '@/components/shared/user-avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getConversationTitle, getOtherParticipant } from '@/lib/utils';
import { useSocket } from '@/providers/socket-provider';
import { useConversation } from '@/queries/use-conversation-queries';
import { useAuthStore } from '@/stores/auth-store';
import { useChatStore } from '@/stores/chat-store';
import { formatRelativeTime } from '@/lib/utils';
import type { CallType } from '@/types';

interface ChatHeaderProps {
  conversationId: string;
  onBack?: () => void;
  onStartCall: (callType: CallType) => void;
  onOpenSearch: () => void;
  onOpenContactInfo: () => void;
  onSelectMessages: () => void;
  onOpenDisappearingMessages: () => void;
  onClearChat: () => void;
  onDeleteChat: () => void;
  onOpenCallHistory: () => void;
  onUndoAction: () => void;
  onRedoAction: () => void;
  onUpdateMute: (mutedUntil: string | null) => void;
  mutePending: boolean;
}

export function ChatHeader({
  conversationId,
  onBack,
  onStartCall,
  onOpenSearch,
  onOpenContactInfo,
  onSelectMessages,
  onOpenDisappearingMessages,
  onClearChat,
  onDeleteChat,
  onOpenCallHistory,
  onUndoAction,
  onRedoAction,
  onUpdateMute,
  mutePending,
}: ChatHeaderProps) {
  const socket = useSocket();
  const conversationQuery = useConversation(conversationId);
  const currentUserId = useAuthStore((state) => state.user?.id);
  const typingByConversation = useChatStore((state) => state.typingByConversation);
  const typingUserIds = Object.keys(typingByConversation[conversationId] ?? {});

  const conversation = conversationQuery.data;
  const otherParticipant = conversation
    ? getOtherParticipant(conversation, currentUserId)
    : null;
  const title = conversation
    ? getConversationTitle(conversation, currentUserId)
    : 'Conversation';
  const actionsDisabled =
    conversationQuery.isLoading || conversationQuery.isError || !conversation;
  const callsEnabled = !actionsDisabled && conversation?.type === 'DM';
  const myParticipant = useMemo(
    () => conversation?.participants.find((participant) => participant.user_id === currentUserId),
    [conversation?.participants, currentUserId]
  );
  const mutedUntil = myParticipant?.muted_until ?? null;
  const isMuted = Boolean(mutedUntil);
  const muteSubtitle = useMemo(() => {
    if (!mutedUntil) {
      return null;
    }

    const mutedDate = new Date(mutedUntil);
    if (Number.isNaN(mutedDate.getTime())) {
      return 'Muted';
    }
    if (mutedDate.getUTCFullYear() >= 2099) {
      return 'Muted forever';
    }
    return `Muted until ${formatRelativeTime(mutedUntil)}`;
  }, [mutedUntil]);

  const subtitle = useMemo(() => {
    if (!conversation) {
      return conversationQuery.isError
        ? 'Unable to load conversation'
        : 'Loading...';
    }

    if (typingUserIds.length > 0) {
      return 'typing...';
    }

    if (!socket.connected) {
      return 'Connecting...';
    }

    if (conversation.type === 'DM') {
      return otherParticipant?.is_online ? 'online' : 'offline';
    }

    const participantCount = conversation.participants.length;
    return `${participantCount} participant${participantCount === 1 ? '' : 's'}`;
  }, [
    conversation,
    conversationQuery.isError,
    otherParticipant?.is_online,
    socket.connected,
    typingUserIds.length,
  ]);

  const isOnline = otherParticipant?.is_online ?? false;
  const isTyping = typingUserIds.length > 0;

  return (
    <header className="flex h-[59px] shrink-0 items-center gap-3 border-b border-border bg-sidebar px-4  ">
      {/* Back button (mobile) */}
      {onBack && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-10 w-10 shrink-0 rounded-full lg:hidden"
          onClick={onBack}
          aria-label="Back to conversations"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
      )}

      {/* Avatar and info */}
      <div className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
        <UserAvatar
          src={conversation?.avatar_url ?? otherParticipant?.avatar_url}
          alt={title}
          fallback={title[0]}
          size="md"
          showStatus={conversation?.type === 'DM'}
          isOnline={isOnline}
        />

        <div className="min-w-0 flex-1">
          <p className="truncate text-[16px] font-medium text-foreground">{title}</p>
          <p
            className={`truncate text-[13px] ${
              isTyping
                ? 'text-primary'
                : isOnline
                  ? 'text-primary'
                  : 'text-muted-foreground '
            }`}
          >
            {subtitle}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-1">
        {conversation?.type === 'DM' && (
          <>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-full text-muted-foreground hover:bg-muted"
              onClick={() => onStartCall('VIDEO')}
              disabled={!callsEnabled}
              aria-label="Start video call"
            >
              <Video className="h-5 w-5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-full text-muted-foreground hover:bg-muted"
              onClick={() => onStartCall('AUDIO')}
              disabled={!callsEnabled}
              aria-label="Start voice call"
            >
              <Phone className="h-5 w-5" />
            </Button>
          </>
        )}

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-full text-muted-foreground hover:bg-muted"
          onClick={onOpenSearch}
          disabled={actionsDisabled}
          aria-label="Search messages"
        >
          <Search className="h-5 w-5" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-full text-muted-foreground hover:bg-muted"
          onClick={onUndoAction}
          disabled={actionsDisabled}
          aria-label="Undo"
        >
          <Undo2 className="h-5 w-5" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-full text-muted-foreground hover:bg-muted"
          onClick={onRedoAction}
          disabled={actionsDisabled}
          aria-label="Redo"
        >
          <Redo2 className="h-5 w-5" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-full text-muted-foreground hover:bg-muted"
              aria-label="Conversation actions"
            >
              <MoreVertical className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem onClick={onOpenContactInfo}>Contact info</DropdownMenuItem>
            <DropdownMenuItem onClick={onSelectMessages}>Select messages</DropdownMenuItem>
            {isMuted ? (
              <DropdownMenuItem
                disabled={actionsDisabled || mutePending}
                onClick={() => onUpdateMute(null)}
              >
                Unmute notifications
              </DropdownMenuItem>
            ) : (
              <>
                <DropdownMenuItem
                  disabled={actionsDisabled || mutePending}
                  onClick={() => onUpdateMute(new Date(Date.now() + 60 * 60 * 1000).toISOString())}
                >
                  Mute for 1 hour
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={actionsDisabled || mutePending}
                  onClick={() => onUpdateMute(new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString())}
                >
                  Mute for 8 hours
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={actionsDisabled || mutePending}
                  onClick={() => onUpdateMute(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString())}
                >
                  Mute for 1 week
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={actionsDisabled || mutePending}
                  onClick={() => onUpdateMute(new Date('2099-12-31T23:59:59.000Z').toISOString())}
                >
                  Mute always
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuItem onClick={onOpenDisappearingMessages}>Disappearing messages</DropdownMenuItem>
            <DropdownMenuItem onClick={onOpenCallHistory}>Call history</DropdownMenuItem>
            {muteSubtitle ? <DropdownMenuItem disabled>{muteSubtitle}</DropdownMenuItem> : null}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onClearChat}>Clear chat</DropdownMenuItem>
            <DropdownMenuItem className="text-destructive" onClick={onDeleteChat}>Delete chat</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
