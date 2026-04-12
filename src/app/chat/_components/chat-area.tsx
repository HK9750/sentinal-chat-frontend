'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CallModal } from '@/components/shared/call-modal';
import {
  CallHistoryDialog,
  ConfirmActionDialog,
  ContactInfoDialog,
  DisappearingMessagesDialog,
} from '@/components/shared/chat-action-dialogs';
import { MessageSearchPanel } from '@/components/shared/message-search-panel';
import { getConversationTitle, getOtherParticipant } from '@/lib/utils';
import { useMessageChannel } from '@/hooks/use-message-channel';
import {
  useClearConversationMutation,
  useConversation,
  useDeleteConversationMutation,
  useUpdateConversationMutation,
  useUpdateConversationMuteMutation,
} from '@/queries/use-conversation-queries';
import { useMessages } from '@/queries/use-message-queries';
import { useAuthStore } from '@/stores/auth-store';
import { useChatSelectionStore } from '@/stores/chat-selection-store';
import type { CallType, DisappearingMode, Message } from '@/types';
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
  const messagesQuery = useMessages(conversationId);
  const { deleteMessages } = useMessageChannel(conversationId);
  const clearConversationMutation = useClearConversationMutation(conversationId);
  const deleteConversationMutation = useDeleteConversationMutation(conversationId);
  const updateConversationMutation = useUpdateConversationMutation(conversationId);
  const updateMuteMutation = useUpdateConversationMuteMutation(conversationId);

  const selectionConversationId = useChatSelectionStore((state) => state.conversationId);
  const selectionEnabled = useChatSelectionStore((state) => state.enabled);
  const selectedMessageIds = useChatSelectionStore((state) => state.selectedMessageIds);
  const startSelection = useChatSelectionStore((state) => state.startSelection);
  const stopSelection = useChatSelectionStore((state) => state.stopSelection);
  const toggleMessage = useChatSelectionStore((state) => state.toggleMessage);
  const clearSelection = useChatSelectionStore((state) => state.clearSelection);
  const pruneMissing = useChatSelectionStore((state) => state.pruneMissing);

  const scrollRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [callModalOpen, setCallModalOpen] = useState(false);
  const [callType, setCallType] = useState<CallType>('AUDIO');
  const [searchOpen, setSearchOpen] = useState(false);
  const [contactInfoOpen, setContactInfoOpen] = useState(false);
  const [disappearingOpen, setDisappearingOpen] = useState(false);
  const [clearChatOpen, setClearChatOpen] = useState(false);
  const [deleteChatOpen, setDeleteChatOpen] = useState(false);
  const [callHistoryOpen, setCallHistoryOpen] = useState(false);

  // Reply and edit state
  const [replyToMessage, setReplyToMessage] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);

  const conversation = conversationQuery.data;
  const otherParticipant = useMemo(
    () => (conversation ? getOtherParticipant(conversation, currentUserId) : null),
    [conversation, currentUserId]
  );
  const recipientName = conversation
    ? getConversationTitle(conversation, currentUserId)
    : 'Conversation';

  const isSelectionMode =
    selectionEnabled && selectionConversationId === conversationId;

  const visibleMessageIds = useMemo(
    () => (messagesQuery.data ?? []).map((message) => message.id),
    [messagesQuery.data]
  );

  useEffect(() => {
    stopSelection();
  }, [stopSelection]);

  useEffect(() => {
    if (!isSelectionMode) {
      return;
    }
    pruneMissing(visibleMessageIds);
  }, [isSelectionMode, pruneMissing, visibleMessageIds]);

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

  const handleSelectMessages = useCallback(() => {
    setReplyToMessage(null);
    setEditingMessage(null);
    startSelection(conversationId);
  }, [conversationId, startSelection]);

  const handleToggleSelected = useCallback(
    (message: Message) => {
      if (!isSelectionMode || message.deleted_at) {
        return;
      }
      toggleMessage(message.id);
    },
    [isSelectionMode, toggleMessage]
  );

  const handleDeleteSelectedForMe = useCallback(() => {
    if (!isSelectionMode || selectedMessageIds.length === 0) {
      return;
    }
    deleteMessages(selectedMessageIds, 'FOR_ME');
    clearSelection();
    stopSelection();
  }, [clearSelection, deleteMessages, isSelectionMode, selectedMessageIds, stopSelection]);

  const handleDeleteSelectedForEveryone = useCallback(() => {
    if (!isSelectionMode || selectedMessageIds.length === 0) {
      return;
    }
    deleteMessages(selectedMessageIds, 'FOR_EVERYONE');
    clearSelection();
    stopSelection();
  }, [clearSelection, deleteMessages, isSelectionMode, selectedMessageIds, stopSelection]);

  const handleUpdateDisappearingMode = useCallback(
    async (mode: DisappearingMode) => {
      await updateConversationMutation.mutateAsync({
        disappearing_mode: mode,
      });
      setDisappearingOpen(false);
    },
    [updateConversationMutation]
  );

  const handleClearChat = useCallback(async () => {
    await clearConversationMutation.mutateAsync();
    setClearChatOpen(false);
  }, [clearConversationMutation]);

  const handleDeleteChat = useCallback(async () => {
    await deleteConversationMutation.mutateAsync();
    setDeleteChatOpen(false);
    router.push('/chat', { scroll: false });
  }, [deleteConversationMutation, router]);

  const handleUpdateMute = useCallback(
    (mutedUntil: string | null) => {
      void updateMuteMutation.mutateAsync({ muted_until: mutedUntil });
    },
    [updateMuteMutation]
  );

  return (
    <div className="relative flex h-full flex-col">
      {/* Chat header */}
      <ChatHeader
        conversationId={conversationId}
        onBack={handleBack}
        onStartCall={handleStartCall}
        onOpenSearch={() => setSearchOpen(true)}
        onOpenContactInfo={() => setContactInfoOpen(true)}
        onSelectMessages={handleSelectMessages}
        onOpenDisappearingMessages={() => setDisappearingOpen(true)}
        onClearChat={() => setClearChatOpen(true)}
        onDeleteChat={() => setDeleteChatOpen(true)}
        onOpenCallHistory={() => setCallHistoryOpen(true)}
        onUpdateMute={handleUpdateMute}
        mutePending={updateMuteMutation.isPending}
      />

      {/* Messages area with WhatsApp background pattern */}
      <div className="chat-pattern relative flex-1 overflow-hidden">
        <MessageList
          conversationId={conversationId}
          currentUserId={currentUserId}
          scrollRef={scrollRef}
          messageRefs={messageRefs}
          onReply={handleReply}
          onEdit={handleEdit}
          selectionMode={isSelectionMode}
          selectedMessageIds={isSelectionMode ? selectedMessageIds : []}
          onToggleSelected={handleToggleSelected}
          onCancelSelection={stopSelection}
          onDeleteSelectedForMe={handleDeleteSelectedForMe}
          onDeleteSelectedForEveryone={handleDeleteSelectedForEveryone}
        />
      </div>

      {/* Message input */}
      {!isSelectionMode && (
        <MessageInput
          key={editingMessage?.id ?? 'composer'}
          conversationId={conversationId}
          replyToMessage={replyToMessage}
          editingMessage={editingMessage}
          onCancelReply={handleCancelReply}
          onCancelEdit={handleCancelEdit}
        />
      )}

      {/* Search panel */}
      <MessageSearchPanel
        conversationId={conversationId}
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        onNavigateToMessage={handleNavigateToMessage}
      />

      {/* Call modal */}
      <CallModal
        isOpen={callModalOpen}
        onClose={() => setCallModalOpen(false)}
        conversationId={conversationId}
        callType={callType}
        recipientName={recipientName}
        recipientAvatarUrl={otherParticipant?.avatar_url}
      />

      <ContactInfoDialog
        open={contactInfoOpen}
        onOpenChange={setContactInfoOpen}
        conversation={conversation}
        title={recipientName}
      />

      <DisappearingMessagesDialog
        open={disappearingOpen}
        onOpenChange={setDisappearingOpen}
        value={conversation?.disappearing_mode ?? 'OFF'}
        pending={updateConversationMutation.isPending}
        onSelectMode={(mode) => {
          void handleUpdateDisappearingMode(mode);
        }}
      />

      <ConfirmActionDialog
        open={clearChatOpen}
        onOpenChange={setClearChatOpen}
        title="Clear chat"
        description="This clears messages for your account in this chat. Other participants keep their copies."
        confirmLabel="Clear chat"
        pending={clearConversationMutation.isPending}
        onConfirm={() => {
          void handleClearChat();
        }}
      />

      <ConfirmActionDialog
        open={deleteChatOpen}
        onOpenChange={setDeleteChatOpen}
        title="Delete chat"
        description="This removes this chat from your list. Other participants can still see the conversation."
        confirmLabel="Delete chat"
        confirmVariant="destructive"
        pending={deleteConversationMutation.isPending}
        onConfirm={() => {
          void handleDeleteChat();
        }}
      />

      <CallHistoryDialog
        open={callHistoryOpen}
        onOpenChange={setCallHistoryOpen}
        conversationId={conversationId}
      />
    </div>
  );
}
