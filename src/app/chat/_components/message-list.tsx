'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Lock } from 'lucide-react';
import { MessageBubble } from '@/components/shared/message-bubble';
import { MessageListSkeleton } from '@/components/shared/message-skeleton';
import { TypingBubble } from '@/components/shared/typing-indicator';
import { useMessages } from '@/queries/use-message-queries';
import { useReceiptChannel } from '@/hooks/use-receipt-channel';
import { useMessageChannel } from '@/hooks/use-message-channel';
import { formatCalendarLabel, getOtherParticipant } from '@/lib/utils';
import { useConversation } from '@/queries/use-conversation-queries';
import { useChatStore } from '@/stores/chat-store';
import type { Message } from '@/types';

interface MessageListProps {
  conversationId: string;
  currentUserId: string | undefined;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  messageRefs: React.RefObject<Map<string, HTMLDivElement>>;
  onReply?: (message: Message) => void;
  onEdit?: (message: Message) => void;
}

export function MessageList({
  conversationId,
  currentUserId,
  scrollRef,
  messageRefs,
  onReply,
  onEdit,
}: MessageListProps) {
  const conversationQuery = useConversation(conversationId);
  const messagesRaw = useMessages(conversationId);
  const messagesQuery = useMemo(() => ({
    items: messagesRaw.data ?? [],
    isLoading: messagesRaw.isLoading,
    isError: messagesRaw.isError,
  }), [messagesRaw.data, messagesRaw.isLoading, messagesRaw.isError]);
  const { sendDeliveredReceipt, sendReadReceipt, sendPlayedReceipt } =
    useReceiptChannel(conversationId);
  const { deleteMessage, reactToMessage } = useMessageChannel(conversationId);
  const typingByConversation = useChatStore((state) => state.typingByConversation);
  const deliveredSetRef = useRef(new Set<string>());
  const readSetRef = useRef(new Set<string>());

  // Get typing users for this conversation (excluding current user)
  const typingUserIds = useMemo(() => {
    const typingUsers = typingByConversation[conversationId] ?? {};
    return Object.keys(typingUsers).filter((userId) => userId !== currentUserId);
  }, [conversationId, currentUserId, typingByConversation]);

  useEffect(() => {
    deliveredSetRef.current.clear();
    readSetRef.current.clear();
  }, [conversationId]);

  useEffect(() => {
    if (scrollRef.current && messagesQuery.items.length > 0) {
      const scroller = scrollRef.current.parentElement;
      const nearBottom = scroller
        ? scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight < 160
        : true;

      if (!nearBottom) {
        return;
      }

      scrollRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [messagesQuery.items.length, scrollRef]);

  useEffect(() => {
    const receivable = messagesQuery.items.filter(
      (message) => message.sender_id !== currentUserId && !message.deleted_at
    );

    const deliverableIds = receivable
      .map((message) => message.id)
      .filter((messageId) => !deliveredSetRef.current.has(messageId));

    if (deliverableIds.length > 0) {
      deliverableIds.forEach((messageId) => deliveredSetRef.current.add(messageId));
      sendDeliveredReceipt(deliverableIds);
    }

    if (document.visibilityState !== 'visible') {
      return;
    }

    const latestReadable = [...receivable]
      .reverse()
      .find((message) => !readSetRef.current.has(message.id));

    if (latestReadable) {
      const readableIds = receivable
        .map((message) => message.id)
        .filter((messageId) => !readSetRef.current.has(messageId));

      readableIds.forEach((messageId) => readSetRef.current.add(messageId));
      sendReadReceipt(readableIds, latestReadable.seq_id);
    }
  }, [currentUserId, messagesQuery.items, sendDeliveredReceipt, sendReadReceipt]);

  const setMessageRef = useCallback(
    (messageId: string, element: HTMLDivElement | null) => {
      if (element) {
        messageRefs.current.set(messageId, element);
      } else {
        messageRefs.current.delete(messageId);
      }
    },
    [messageRefs]
  );

  const authorLookup = useMemo(() => {
    const participants = conversationQuery.data?.participants ?? [];
    return new Map(participants.map((participant) => [participant.user_id, participant]));
  }, [conversationQuery.data?.participants]);

  const groupedMessages = useMemo(() => {
    const groups: Array<{ label: string; items: typeof messagesQuery.items }> = [];
    const items = messagesQuery.items;

    for (const item of items) {
      const label = formatCalendarLabel(item.created_at);
      const lastGroup = groups[groups.length - 1];

      if (!lastGroup || lastGroup.label !== label) {
        groups.push({ label, items: [item] });
        continue;
      }

      lastGroup.items.push(item);
    }

    return groups;
  }, [messagesQuery]);

  const handleDelete = useCallback(
    (message: Message) => {
      deleteMessage(message.id);
    },
    [deleteMessage]
  );

  const handleReact = useCallback(
    (messageId: string, emoji: string, mode: 'add' | 'remove') => {
      reactToMessage(messageId, emoji, mode);
    },
    [reactToMessage]
  );

  if (messagesQuery.isLoading || conversationQuery.isLoading) {
    return (
      <div className="flex-1 overflow-y-auto px-4 py-4 lg:px-16">
        <MessageListSkeleton />
      </div>
    );
  }

  if (conversationQuery.isError) {
    return (
      <div className="flex flex-1 items-center justify-center px-6">
        <div className="text-center">
          <p className="text-base font-medium text-foreground">
            Unable to load this conversation
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Refresh or go back to the chat list.
          </p>
        </div>
      </div>
    );
  }

  if (messagesQuery.isError) {
    return (
      <div className="flex flex-1 items-center justify-center px-6">
        <div className="text-center">
          <p className="text-base font-medium text-foreground">Unable to load messages</p>
          <p className="mt-1 text-sm text-muted-foreground">
            The conversation opened, but message history could not be loaded.
          </p>
        </div>
      </div>
    );
  }

  if (messagesQuery.items.length === 0) {
    const otherParticipant = conversationQuery.data
      ? getOtherParticipant(conversationQuery.data, currentUserId)
      : null;

    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6">
        {/* Encryption notice - WhatsApp style */}
        <div className="mb-8 flex max-w-md items-center gap-2 rounded-lg bg-accent/50 px-4 py-3 text-center text-xs text-accent-foreground">
          <Lock className="h-4 w-4 shrink-0" />
          <span>
            Messages are end-to-end encrypted. No one outside of this chat can read them.
          </span>
        </div>

        <div className="rounded-lg bg-card px-6 py-4 text-center shadow-sm">
          <p className="text-sm text-muted-foreground">
            {otherParticipant
              ? `Start chatting with ${otherParticipant.display_name}`
              : 'Send the first message'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 lg:px-16">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-1">
        {/* Encryption notice at top */}
        <div className="mb-4 flex items-center justify-center gap-2 rounded-lg bg-accent/30 px-4 py-2 text-center text-xs text-muted-foreground">
          <Lock className="h-3 w-3" />
          <span>Messages are end-to-end encrypted</span>
        </div>

        {groupedMessages.map((group) => (
          <div key={group.label} className="space-y-1">
            {/* Date separator - WhatsApp style */}
            <div className="sticky top-2 z-10 flex justify-center py-2">
              <span className="rounded-lg bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
                {group.label}
              </span>
            </div>

            {/* Messages */}
            <div className="space-y-0.5">
              {group.items.map((message, index) => {
                const previous = group.items[index - 1];
                const isOwn = message.sender_id === currentUserId;
                const isFirstFromSender = previous?.sender_id !== message.sender_id;
                const author = authorLookup.get(message.sender_id);

                return (
                  <div
                    key={message.id}
                    ref={(element) => setMessageRef(message.id, element)}
                  >
                    <MessageBubble
                      message={message}
                      isOwn={isOwn}
                      showTail={isFirstFromSender}
                      authorLabel={author?.display_name ?? author?.username ?? 'Member'}
                      currentUserId={currentUserId}
                      onPlayed={sendPlayedReceipt}
                      onReply={onReply}
                      onEdit={onEdit}
                      onDelete={handleDelete}
                      onReact={handleReact}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {typingUserIds.length > 0 && <TypingBubble />}

        <div ref={scrollRef} />
      </div>
    </div>
  );
}
