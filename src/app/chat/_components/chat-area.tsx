'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CallModal } from '@/components/shared/call-modal';
import {
  CallHistoryDialog,
  ConfirmActionDialog,
  ContactInfoDialog,
  DisappearingMessagesDialog,
  ForwardMessagesDialog,
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
  const { deleteMessages, sendMessage } = useMessageChannel(conversationId);
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
  const [forwardDialogOpen, setForwardDialogOpen] = useState(false);
  const [forwardSessionId, setForwardSessionId] = useState(0);
  const [forwardMessages, setForwardMessages] = useState<Message[]>([]);
  const [forwardPending, setForwardPending] = useState(false);

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
  const visibleMessagesById = useMemo(
    () =>
      new Map(
        (messagesQuery.data ?? []).map((message) => [message.id, message])
      ),
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

  const handleForwardMessage = useCallback((message: Message) => {
    if (message.deleted_at || message.type === 'SYSTEM' || message.type === 'POLL') {
      return;
    }
    setForwardSessionId((current) => current + 1);
    setForwardMessages([message]);
    setForwardDialogOpen(true);
  }, []);

  const handleForwardSelected = useCallback(() => {
    if (!isSelectionMode || selectedMessageIds.length === 0) {
      return;
    }

    const selected = selectedMessageIds
      .map((id) => visibleMessagesById.get(id))
      .filter((message): message is Message => Boolean(message))
      .filter((message) => !message.deleted_at && message.type !== 'SYSTEM' && message.type !== 'POLL')
      .sort((a, b) => a.seq_id - b.seq_id);

    if (selected.length === 0) {
      return;
    }

    setForwardSessionId((current) => current + 1);
    setForwardMessages(selected);
    setForwardDialogOpen(true);
  }, [isSelectionMode, selectedMessageIds, visibleMessagesById]);

  const handleForwardToConversations = useCallback(
    (targetConversationIds: string[]) => {
      if (targetConversationIds.length === 0 || forwardMessages.length === 0) {
        return;
      }

      setForwardPending(true);

      try {
        const ordered = [...forwardMessages].sort((a, b) => a.seq_id - b.seq_id);

        for (const targetConversationId of targetConversationIds) {
          for (const message of ordered) {
            if (message.deleted_at || message.type === 'SYSTEM' || message.type === 'POLL') {
              continue;
            }

            sendMessage(
              message.content ?? '',
              message.type,
              message.attachments.map((attachment) => attachment.id),
              undefined,
              {
                conversationId: targetConversationId,
                isForwarded: true,
              }
            );
          }
        }

        setForwardDialogOpen(false);
        setForwardMessages([]);
        if (isSelectionMode) {
          clearSelection();
          stopSelection();
        }
      } finally {
        setForwardPending(false);
      }
    },
    [clearSelection, forwardMessages, isSelectionMode, sendMessage, stopSelection]
  );

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
          onForward={handleForwardMessage}
          selectionMode={isSelectionMode}
          selectedMessageIds={isSelectionMode ? selectedMessageIds : []}
          selectionPending={forwardPending}
          onToggleSelected={handleToggleSelected}
          onCancelSelection={stopSelection}
          onForwardSelected={handleForwardSelected}
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

      <ForwardMessagesDialog
        key={forwardSessionId}
        open={forwardDialogOpen}
        onOpenChange={(open) => {
          setForwardDialogOpen(open);
          if (!open) {
            setForwardMessages([]);
          }
        }}
        messages={forwardMessages}
        pending={forwardPending}
        onForward={handleForwardToConversations}
      />
    </div>
  );
}
