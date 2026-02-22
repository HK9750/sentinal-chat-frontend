'use client';

import { useRef, useCallback, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useConversation } from '@/queries/use-conversation-queries';
import { useAuthStore } from '@/stores/auth-store';
import { ChatHeader } from './chat-header';
import { MessageList } from './message-list';
import { MessageInput } from './message-input';
import { CallModal } from '@/components/shared/call-modal';
import { MessageSearchPanel } from '@/components/shared/message-search-panel';
import type { CallType } from '@/types/call';

interface ChatAreaProps {
  conversationId: string;
}

export function ChatArea({ conversationId }: ChatAreaProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentUser = useAuthStore((state) => state.user);
  const scrollRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const [callModalOpen, setCallModalOpen] = useState(false);
  const [callType, setCallType] = useState<CallType>('AUDIO');
  const [searchOpen, setSearchOpen] = useState(false);

  const { data: conversation } = useConversation(conversationId);

  const handleBack = useCallback(() => {
    const params = new URLSearchParams(searchParams);
    params.delete('conversation');
    router.push(`?${params.toString()}`, { scroll: false });
  }, [router, searchParams]);

  const handleStartCall = useCallback((type: CallType) => {
    setCallType(type);
    setCallModalOpen(true);
  }, []);

  const handleNavigateToMessage = useCallback((messageId: string) => {
    const el = messageRefs.current.get(messageId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-2', 'ring-blue-500', 'ring-opacity-50');
      setTimeout(() => el.classList.remove('ring-2', 'ring-blue-500', 'ring-opacity-50'), 2000);
    }
  }, []);

  return (
    <div className="relative flex flex-col h-full">
      <ChatHeader
        conversationId={conversationId}
        onBack={handleBack}
        onStartCall={handleStartCall}
        onOpenSearch={() => setSearchOpen(true)}
      />
      <MessageList
        conversationId={conversationId}
        currentUserId={currentUser?.id}
        scrollRef={scrollRef}
        messageRefs={messageRefs}
      />
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
        recipientName={conversation?.subject || 'Contact'}
        recipientAvatarUrl={conversation?.avatar_url}
      />
    </div>
  );
}
