'use client';

import { useCallback, useEffect, useMemo } from 'react';
import { Send } from 'lucide-react';
import { MessageBubble } from '@/components/shared/message-bubble';
import { Spinner } from '@/components/shared/spinner';
import { useDecryptedMessages } from '@/hooks/use-decrypted-messages';
import { getOtherParticipant } from '@/lib/utils';
import { useConversation } from '@/queries/use-conversation-queries';

interface MessageListProps {
  conversationId: string;
  currentUserId: string | undefined;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  messageRefs: React.RefObject<Map<string, HTMLDivElement>>;
}

export function MessageList({ conversationId, currentUserId, scrollRef, messageRefs }: MessageListProps) {
  const conversationQuery = useConversation(conversationId);
  const messagesQuery = useDecryptedMessages(conversationId);

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

  if (messagesQuery.isLoading || conversationQuery.isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (conversationQuery.isError) {
    return (
      <div className="flex flex-1 items-center justify-center px-6">
        <div className="text-center">
          <p className="text-base font-semibold">Unable to load this conversation</p>
          <p className="mt-1 text-sm text-muted-foreground">Refresh or go back to the chat list and try again.</p>
        </div>
      </div>
    );
  }

  if (messagesQuery.isError) {
    return (
      <div className="flex flex-1 items-center justify-center px-6">
        <div className="text-center">
          <p className="text-base font-semibold">Unable to load messages</p>
          <p className="mt-1 text-sm text-muted-foreground">The conversation opened, but message history could not be loaded.</p>
        </div>
      </div>
    );
  }

  if (messagesQuery.items.length === 0) {
    const otherParticipant = conversationQuery.data ? getOtherParticipant(conversationQuery.data, currentUserId) : null;

    return (
      <div className="flex flex-1 items-center justify-center px-6">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
            <Send className="size-7" />
          </div>
          <p className="text-base font-semibold">No messages yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {otherParticipant ? `Start your encrypted chat with ${otherParticipant.display_name}.` : 'Send the first encrypted message in this conversation.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-[#efeae2] px-3 py-6 lg:px-6">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-2">
        {messagesQuery.items.map(({ message, decrypted }, index) => {
          const previous = messagesQuery.items[index - 1]?.message;
          const isOwn = message.sender_id === currentUserId;
          const showAvatar = !isOwn && previous?.sender_id !== message.sender_id;
          const author = authorLookup.get(message.sender_id);

          return (
            <div key={message.id} ref={(element) => setMessageRef(message.id, element)}>
              <MessageBubble
                conversationId={conversationId}
                message={message}
                decrypted={decrypted}
                isOwn={isOwn}
                showAvatar={showAvatar}
                authorLabel={author?.display_name ?? author?.username ?? 'Member'}
                avatarUrl={author?.avatar_url}
              />
            </div>
          );
        })}
        <div ref={scrollRef} />
      </div>
    </div>
  );
}
