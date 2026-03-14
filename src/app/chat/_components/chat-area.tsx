'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CallModal } from '@/components/shared/call-modal';
import { MessageSearchPanel } from '@/components/shared/message-search-panel';
import { getConversationTitle, getOtherParticipant } from '@/lib/utils';
import { useConversation } from '@/queries/use-conversation-queries';
import { useAuthStore } from '@/stores/auth-store';
import type { CallType } from '@/types';
import { ChatHeader } from './chat-header';
import { ConversationKeyBanner } from './conversation-key-banner';
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

  const conversation = conversationQuery.data;
  const otherParticipant = useMemo(() => (conversation ? getOtherParticipant(conversation, currentUserId) : null), [conversation, currentUserId]);
  const recipientName = conversation ? getConversationTitle(conversation, currentUserId) : 'Conversation';

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

  return (
    <div className="relative flex h-full flex-col">
      <ChatHeader
        conversationId={conversationId}
        onBack={handleBack}
        onStartCall={handleStartCall}
        onOpenSearch={() => setSearchOpen(true)}
      />
      <ConversationKeyBanner conversationId={conversationId} />
      <MessageList conversationId={conversationId} currentUserId={currentUserId} scrollRef={scrollRef} messageRefs={messageRefs} />
      <MessageInput conversationId={conversationId} />

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
