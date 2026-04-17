'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Lock } from 'lucide-react';
import { MessageBubble } from '@/components/shared/message-bubble';
import { MessageSelectionToolbar } from '@/components/shared/chat-action-dialogs';
import { MessageListSkeleton } from '@/components/shared/message-skeleton';
import { TypingBubble } from '@/components/shared/typing-indicator';
import { useMessages } from '@/queries/use-message-queries';
import { useReceiptChannel } from '@/hooks/use-receipt-channel';
import { useMessageChannel } from '@/hooks/use-message-channel';
import { formatCalendarLabel, getOtherParticipant } from '@/lib/utils';
import { useConversation } from '@/queries/use-conversation-queries';
import { useChatStore } from '@/stores/chat-store';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/queries/query-keys';
import type { Message, Conversation, ConversationListPayload } from '@/types';

const EMPTY_TYPING_USERS: Record<string, number> = {};
const EMPTY_MESSAGES: Message[] = [];
const EMPTY_SELECTED_IDS: string[] = [];

interface MessageListProps {
  conversationId: string;
  currentUserId: string | undefined;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  messageRefs: React.RefObject<Map<string, HTMLDivElement>>;
  onReply?: (message: Message) => void;
  onEdit?: (message: Message) => void;
  onForward?: (message: Message) => void;
  selectionMode?: boolean;
  selectedMessageIds?: string[];
  selectionPending?: boolean;
  onToggleSelected?: (message: Message) => void;
  onCancelSelection?: () => void;
  onForwardSelected?: () => void;
  onDeleteSelectedForMe?: () => void;
  onDeleteSelectedForEveryone?: () => void;
}

export function MessageList({
  conversationId,
  currentUserId,
  scrollRef,
  messageRefs,
  onReply,
  onEdit,
  onForward,
  selectionMode = false,
  selectedMessageIds = EMPTY_SELECTED_IDS,
  selectionPending = false,
  onToggleSelected,
  onCancelSelection,
  onForwardSelected,
  onDeleteSelectedForMe,
  onDeleteSelectedForEveryone,
}: MessageListProps) {
  const conversationQuery = useConversation(conversationId);
  const messagesRaw = useMessages(conversationId);
  const messages = useMemo(() => messagesRaw.data ?? EMPTY_MESSAGES, [messagesRaw.data]);

  const queryClient = useQueryClient();
  const { sendDeliveredReceipt, sendReadReceipt, sendPlayedReceipt } =
    useReceiptChannel(conversationId);
  const { deleteMessage, reactToMessage, votePoll } = useMessageChannel(conversationId);
  const typingUsersByConversation = useChatStore(
    (state) => state.typingByConversation[conversationId] ?? EMPTY_TYPING_USERS
  );
  const deliveredSetRef = useRef(new Set<string>());
  const readSetRef = useRef(new Set<string>());

  // Get typing users for this conversation (excluding current user)
  const typingUserIds = useMemo(() => {
    return Object.keys(typingUsersByConversation).filter((userId) => userId !== currentUserId);
  }, [currentUserId, typingUsersByConversation]);

  const messageById = useMemo(() => {
    return new Map(messages.map((message) => [message.id, message]));
  }, [messages]);

  useEffect(() => {
    deliveredSetRef.current.clear();
    readSetRef.current.clear();
  }, [conversationId]);

  useEffect(() => {
    if (!scrollRef.current || messages.length === 0) {
      return;
    }

    const scroller = scrollRef.current.parentElement;
    if (!scroller) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
      return;
    }

    const threshold = 120;
    const nearBottom = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight <= threshold;
    if (!nearBottom) {
      return;
    }

    scroller.scrollTo({ top: scroller.scrollHeight, behavior: 'auto' });
  }, [messages.length, scrollRef]);

  useEffect(() => {
    const scroller = scrollRef.current?.parentElement;
    if (!scroller) {
      return;
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') {
        return;
      }

      const threshold = 120;
      const nearBottom = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight <= threshold;
      if (nearBottom) {
        scroller.scrollTo({ top: scroller.scrollHeight, behavior: 'auto' });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [scrollRef]);

  useEffect(() => {
    const receivable = messages.filter(
      (message) => message.sender_id !== currentUserId && !message.deleted_at
    );

    const deliverableIds: string[] = [];
    for (const message of receivable) {
      if (!deliveredSetRef.current.has(message.id)) {
        deliverableIds.push(message.id);
      }
    }

    if (deliverableIds.length > 0) {
      deliverableIds.forEach((messageId) => deliveredSetRef.current.add(messageId));
      sendDeliveredReceipt(deliverableIds);
    }

    if (document.visibilityState !== 'visible') {
      return;
    }

    const conversation = conversationQuery.data;
    if (!conversation) return;

    const unreadCount = conversation.unread_count;

    // Determine the highest seq_id of the incoming messages we currently see
    const latestIncoming = receivable[receivable.length - 1];

    // We send a read receipt if there are global unread messages OR we have local unread messages
    const hasUnreadLocally = latestIncoming && !readSetRef.current.has(latestIncoming.id);
    const hasUnreadGlobally = unreadCount > 0;

    if (hasUnreadLocally || hasUnreadGlobally) {
      const upToSeqId = latestIncoming?.seq_id ?? conversation.last_message?.seq_id;

      if (upToSeqId) {
        // Track the ones we see locally so we don't spam
        if (latestIncoming) {
          receivable.forEach((m) => readSetRef.current.add(m.id));
        }

        // Send one websocket frame: data.up_to_seq_id = last visible incoming seq
        sendReadReceipt([], upToSeqId);

        // Optimistically patch local UI
        if (hasUnreadGlobally) {
          // Update the specific conversation cache
          queryClient.setQueryData<Conversation>(queryKeys.conversation(conversation.id), (old) => {
            if (!old) return old;
            return {
              ...old,
              unread_count: 0,
              participants: old.participants.map((p) =>
                p.user_id === currentUserId
                  ? { ...p, last_read_sequence: Math.max(p.last_read_sequence, upToSeqId) }
                  : p
              ),
            };
          });

          // Update the conversation list payload cache
          queryClient.setQueryData<ConversationListPayload>(queryKeys.conversations, (old) => {
            if (!old) return old;
            return {
              ...old,
              items: old.items.map((c) =>
                c.id === conversation.id
                  ? {
                    ...c,
                    unread_count: 0,
                    participants: c.participants.map((p) =>
                      p.user_id === currentUserId
                        ? { ...p, last_read_sequence: Math.max(p.last_read_sequence, upToSeqId) }
                        : p
                    ),
                  }
                  : c
              ),
            };
          });
        }
      }
    }
  }, [
    currentUserId,
    messages,
    sendDeliveredReceipt,
    sendReadReceipt,
    conversationQuery.data,
    queryClient,
  ]);

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

  const selectedSet = useMemo(
    () => new Set(selectedMessageIds),
    [selectedMessageIds]
  );

  const canDeleteSelectedForEveryone = useMemo(() => {
    if (!selectionMode || selectedSet.size === 0) {
      return false;
    }
    for (const message of messages) {
      if (!selectedSet.has(message.id)) {
        continue;
      }
      if (message.sender_id !== currentUserId || !!message.deleted_at) {
        return false;
      }
    }
    return true;
  }, [currentUserId, messages, selectedSet, selectionMode]);

  const canForwardSelected = useMemo(() => {
    if (!selectionMode || selectedSet.size === 0) {
      return false;
    }
    for (const message of messages) {
      if (!selectedSet.has(message.id)) {
        continue;
      }
      if (!!message.deleted_at || message.type === 'SYSTEM' || message.type === 'POLL') {
        return false;
      }
    }
    return true;
  }, [messages, selectedSet, selectionMode]);

  const groupedMessages = useMemo(() => {
    const groups: Array<{ label: string; items: typeof messages }> = [];

    for (const item of messages) {
      const label = formatCalendarLabel(item.created_at);
      const lastGroup = groups[groups.length - 1];

      if (!lastGroup || lastGroup.label !== label) {
        groups.push({ label, items: [item] });
        continue;
      }

      lastGroup.items.push(item);
    }

    return groups;
  }, [messages]);

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

  const handlePollVote = useCallback(
    (pollId: string, optionIds: string[]) => {
      votePoll(pollId, optionIds);
    },
    [votePoll]
  );

  if (messagesRaw.isLoading || conversationQuery.isLoading) {
    return (
      <div className="h-full overflow-y-auto px-4 py-4 lg:px-16">
        <MessageListSkeleton />
      </div>
    );
  }

  if (conversationQuery.isError) {
    return (
      <div className="flex h-full items-center justify-center px-6">
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

  if (messagesRaw.isError) {
    return (
      <div className="flex h-full items-center justify-center px-6">
        <div className="text-center">
          <p className="text-base font-medium text-foreground">Unable to load messages</p>
          <p className="mt-1 text-sm text-muted-foreground">
            The conversation opened, but message history could not be loaded.
          </p>
        </div>
      </div>
    );
  }

  if (messages.length === 0) {
    const otherParticipant = conversationQuery.data
      ? getOtherParticipant(conversationQuery.data, currentUserId)
      : null;

    return (
      <div className="flex h-full flex-col items-center justify-center px-6">
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
    <div className="message-scroll h-full overflow-y-auto px-2 py-3 md:px-4 lg:px-10">
      {selectionMode && selectedSet.size > 0 && onCancelSelection && onForwardSelected && onDeleteSelectedForMe && onDeleteSelectedForEveryone && (
        <MessageSelectionToolbar
          selectedCount={selectedSet.size}
          canForward={canForwardSelected}
          canDeleteForEveryone={canDeleteSelectedForEveryone}
          pending={selectionPending}
          onCancel={onCancelSelection}
          onForward={onForwardSelected}
          onDeleteForMe={onDeleteSelectedForMe}
          onDeleteForEveryone={onDeleteSelectedForEveryone}
        />
      )}

      <div className="mx-auto flex w-full max-w-[980px] flex-col gap-1">
        {/* Encryption notice at top */}
        {/* <div className="mb-4 flex items-center justify-center gap-2 rounded-lg bg-accent/30 px-4 py-2 text-center text-xs text-muted-foreground">
          <Lock className="h-3 w-3" />
          <span>Messages are end-to-end encrypted</span>
        </div> */}

        {groupedMessages.map((group) => (
          <div key={group.label} className="space-y-1">
            {/* Date separator - WhatsApp style */}
            <div className="sticky top-2 z-10 flex justify-center py-1.5">
              <span className="rounded-lg bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
                {group.label}
              </span>
            </div>

            {/* Messages */}
            <div className="space-y-0.5">
              {group.items.map((message, index) => {
                const previous = group.items[index - 1];
                const next = group.items[index + 1];
                const isOwn = message.sender_id === currentUserId;
                const isFirstFromSender = previous?.sender_id !== message.sender_id;
                const showAvatar = !isOwn && (next?.sender_id !== message.sender_id);
                const author = authorLookup.get(message.sender_id);
                const parentMessage = message.reply_to_msg_id
                  ? messageById.get(message.reply_to_msg_id)
                  : undefined;

                return (
                  <div
                    key={message.id}
                    ref={(element) => setMessageRef(message.id, element)}
                  >
                    <MessageBubble
                      message={message}
                      isOwn={isOwn}
                      showAvatar={showAvatar}
                      showTail={isFirstFromSender}
                      authorLabel={author?.display_name ?? author?.username ?? 'Member'}
                      avatarUrl={author?.avatar_url}
                      currentUserId={currentUserId}
                      replyToMessage={parentMessage}
                      onPlayed={sendPlayedReceipt}
                      onReply={onReply}
                      onEdit={onEdit}
                      onDelete={handleDelete}
                      onForward={onForward}
                      onReact={handleReact}
                      onVotePoll={handlePollVote}
                      selectionMode={selectionMode}
                      selected={selectedSet.has(message.id)}
                      onToggleSelected={onToggleSelected}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {typingUserIds.length > 0 && <TypingBubble className="pl-10" />}

        <div ref={scrollRef} />
      </div>
    </div>
  );
}
