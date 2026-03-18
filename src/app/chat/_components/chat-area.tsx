'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Phone, Video } from 'lucide-react';
import { CallModal } from '@/components/shared/call-modal';
import { MessageSearchPanel } from '@/components/shared/message-search-panel';
import { getConversationTitle, getOtherParticipant } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useConversation } from '@/queries/use-conversation-queries';
import { useAuthStore } from '@/stores/auth-store';
import type { CallType, Message } from '@/types';
import { ChatHeader } from './chat-header';
import { MessageInput } from './message-input';
import { MessageList } from './message-list';

interface ChatAreaProps {
  conversationId: string;
}

export function ChatArea({ conversationId }: ChatAreaProps) {
  const router = useRouter();
  const currentUserId = useAuthStore((state) => state.user?.id);
  const conversationQuery = useConversation(conversationId);
  const scrollRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [callModalOpen, setCallModalOpen] = useState(false);
  const [callType, setCallType] = useState<CallType>('AUDIO');
  const [searchOpen, setSearchOpen] = useState(false);
  
  // Reply and edit state
  const [replyToMessage, setReplyToMessage] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);

  const conversation = conversationQuery.data;
  const otherParticipant = useMemo(() => (conversation ? getOtherParticipant(conversation, currentUserId) : null), [conversation, currentUserId]);
  const recipientName = conversation ? getConversationTitle(conversation, currentUserId) : 'Conversation';
  const isDmConversation = conversation?.type === 'DM';

  const handleBack = useCallback(() => {
    router.push('/chat', { scroll: false });
  }, [router]);

  const handleStartCall = useCallback((nextCallType: CallType) => {
    setCallType(nextCallType);
    setCallModalOpen(true);
  }, []);

  const handleNavigateToMessage = useCallback((messageId: string) => {
    const element = messageRefs.current.get(messageId);

    if (!element) {
      return;
    }

    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    element.classList.add('ring-2', 'ring-primary/60');
    window.setTimeout(() => {
      element.classList.remove('ring-2', 'ring-primary/60');
    }, 1800);
  }, []);

  const handleReply = useCallback((message: Message) => {
    setEditingMessage(null);
    setReplyToMessage(message);
  }, []);

  const handleEdit = useCallback((message: Message) => {
    setReplyToMessage(null);
    setEditingMessage(message);
  }, []);

  const handleCancelReply = useCallback(() => {
    setReplyToMessage(null);
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingMessage(null);
  }, []);

  return (
    <div className="relative flex h-full flex-col bg-transparent">
      <ChatHeader
        conversationId={conversationId}
        onBack={handleBack}
        onStartCall={handleStartCall}
        onOpenSearch={() => setSearchOpen(true)}
      />
      <div className="border-b border-border/60 bg-card/70 px-4 py-2.5 lg:hidden">
        <div className="flex items-center gap-2 overflow-x-auto">
          <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={() => setSearchOpen(true)}>
            <Search className="size-4" />
            Search
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-full"
            onClick={() => handleStartCall('AUDIO')}
            disabled={!isDmConversation}
          >
            <Phone className="size-4" />
            Voice
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-full"
            onClick={() => handleStartCall('VIDEO')}
            disabled={!isDmConversation}
          >
            <Video className="size-4" />
            Video
          </Button>
        </div>
      </div>
      <MessageList
        conversationId={conversationId}
        currentUserId={currentUserId}
        scrollRef={scrollRef}
        messageRefs={messageRefs}
        onReply={handleReply}
        onEdit={handleEdit}
      />
      <MessageInput
        conversationId={conversationId}
        replyToMessage={replyToMessage}
        editingMessage={editingMessage}
        onCancelReply={handleCancelReply}
        onCancelEdit={handleCancelEdit}
      />

      <MessageSearchPanel
        conversationId={conversationId}
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        onNavigateToMessage={handleNavigateToMessage}
      />

      <CallModal
        isOpen={callModalOpen}
        onClose={() => setCallModalOpen(false)}
        conversationId={conversationId}
        callType={callType}
        recipientName={recipientName}
        recipientAvatarUrl={otherParticipant?.avatar_url}
      />
    </div>
  );
}
