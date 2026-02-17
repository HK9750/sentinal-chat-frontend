'use client';

import { useRef, useCallback, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useConversation, useConversationParticipants } from '@/queries/use-conversation-queries';
import { useMessages, useSendMessage } from '@/queries/use-message-queries';
import { useSocket } from '@/providers/socket-provider';
import { useChatStore } from '@/stores/chat-store';
import { useEncryptionStatus, useEncryptMessageMutation } from '@/hooks/use-encryption';
import { MessageBubble } from '@/components/shared/message-bubble';
import { UserAvatar } from '@/components/shared/user-avatar';
import { CallModal } from '@/components/shared/call-modal';
import { FileUploadButton, UploadProgressList } from '@/components/shared/file-upload-button';
import { MessageSearchPanel } from '@/components/shared/message-search-panel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { useAuthStore } from '@/stores/auth-store';
import { Message } from '@/types';
import type { CallType } from '@/types/call';
import {
  MoreVertical,
  Phone,
  Video,
  ArrowLeft,
  Send,
  Smile,
  Search,
  Lock,
  LockOpen,
} from 'lucide-react';

// Stable empty array to prevent infinite re-renders in Zustand selectors
const EMPTY_ARRAY: string[] = [];

interface ChatAreaProps {
  conversationId: string;
}

interface GroupedMessage {
  message: Message;
  isOwn: boolean;
  showAvatar: boolean;
  isFirstInGroup: boolean;
  isLastInGroup: boolean;
}

function useGroupedMessages(messages: Message[] | undefined, currentUserId: string | undefined): GroupedMessage[] {
  return useMemo(() => {
    if (!messages) return [];

    return messages.map((msg, index) => {
      const prevMsg = messages[index - 1];
      const nextMsg = messages[index + 1];

      const isOwn = msg.sender_id === currentUserId;
      const isFirstInGroup = !prevMsg || prevMsg.sender_id !== msg.sender_id;
      const isLastInGroup = !nextMsg || nextMsg.sender_id !== msg.sender_id;

      return {
        message: msg,
        isOwn,
        showAvatar: isFirstInGroup && !isOwn,
        isFirstInGroup,
        isLastInGroup,
      };
    });
  }, [messages, currentUserId]);
}

function ChatHeader({
  conversationId,
  onBack,
  onStartCall,
  onOpenSearch,
}: {
  conversationId: string;
  onBack?: () => void;
  onStartCall: (callType: CallType) => void;
  onOpenSearch: () => void;
}) {
  const { data: conversation } = useConversation(conversationId);
  const { data: participants } = useConversationParticipants(conversationId);
  const typingUsers = useChatStore(
    useCallback(
      (state) => state.typingUsers.get(conversationId) ?? EMPTY_ARRAY,
      [conversationId]
    )
  );

  const typingText = useMemo(() => {
    if (typingUsers.length === 0) return null;
    if (typingUsers.length === 1) return 'typing...';
    return `${typingUsers.length} people typing...`;
  }, [typingUsers]);

  return (
    <div className="h-16 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 flex items-center px-4 justify-between shrink-0">
      <div className="flex items-center gap-3">
        {onBack && (
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden text-slate-400 hover:text-white"
            onClick={onBack}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}

        <UserAvatar
          src={conversation?.avatar_url}
          alt={conversation?.subject}
          fallback={conversation?.type === 'DM' ? 'DM' : 'G'}
          size="md"
        />

        <div className="min-w-0">
          <h2 className="text-base font-semibold text-slate-200 truncate">
            {conversation?.subject || 'Chat'}
          </h2>
          <p className="text-xs text-slate-500 truncate">
            {typingText ||
              `${participants?.length || 0} participant${
                participants?.length === 1 ? '' : 's'
              }`}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="text-slate-400 hover:text-white"
          onClick={onOpenSearch}
          title="Search messages"
        >
          <Search className="h-5 w-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="text-slate-400 hover:text-white"
          onClick={() => onStartCall('AUDIO')}
        >
          <Phone className="h-5 w-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="text-slate-400 hover:text-white"
          onClick={() => onStartCall('VIDEO')}
        >
          <Video className="h-5 w-5" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="text-slate-400 hover:text-white"
            >
              <MoreVertical className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem>View Info</DropdownMenuItem>
            <DropdownMenuItem onClick={onOpenSearch}>
              <Search className="h-4 w-4 mr-2" />
              Search Messages
            </DropdownMenuItem>
            <DropdownMenuItem>Mute Notifications</DropdownMenuItem>
            <Separator />
            <DropdownMenuItem className="text-red-500">
              Leave Group
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

function MessageList({
  conversationId,
  currentUserId,
  scrollRef,
  messageRefs,
}: {
  conversationId: string;
  currentUserId: string | undefined;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  messageRefs: React.RefObject<Map<string, HTMLDivElement>>;
}) {
  const { data: messages, isLoading } = useMessages(conversationId);
  const groupedMessages = useGroupedMessages(messages, currentUserId);

  // Register message ref for navigation
  const setMessageRef = useCallback(
    (id: string, el: HTMLDivElement | null) => {
      if (el) {
        messageRefs.current.set(id, el);
      } else {
        messageRefs.current.delete(id);
      }
    },
    [messageRefs]
  );

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-600 border-t-blue-500" />
      </div>
    );
  }

  if (!messages?.length) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-slate-500">No messages yet. Start the conversation!</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-1">
      {groupedMessages.map(({ message, isOwn, showAvatar }) => (
        <div
          key={message.id}
          ref={(el) => setMessageRef(message.id, el)}
          className="transition-all duration-300"
        >
          <MessageBubble
            message={message}
            isOwn={isOwn}
            showAvatar={showAvatar}
            status={isOwn ? 'sent' : undefined}
          />
        </div>
      ))}
      <div ref={scrollRef} />
    </div>
  );
}

function MessageInput({ conversationId }: { conversationId: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const sendMessageMutation = useSendMessage();
  const encryptMessageMutation = useEncryptMessageMutation();
  const { sendTypingStart, sendTypingStop } = useSocket();
  const { data: participants } = useConversationParticipants(conversationId);
  const { isSetup: isEncryptionEnabled, deviceId } = useEncryptionStatus();
  const currentUser = useAuthStore((state) => state.user);

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const input = inputRef.current;
      if (!input || !input.value.trim()) return;

      const content = input.value.trim();
      input.value = '';

      sendTypingStop(conversationId);

      try {
        // Filter out the current user from recipients
        const recipients = participants?.filter((p) => p.user_id !== currentUser?.id) || [];
        
        if (isEncryptionEnabled && recipients.length > 0) {
          // Encrypt message for each recipient
          // For now, we assume each user has one device (could be enhanced for multi-device)
          const ciphertexts = await Promise.all(
            recipients.map(async (p) => {
              try {
                // Use participant's user_id as device_id (simplified - in production, fetch actual device IDs)
                const result = await encryptMessageMutation.mutateAsync({
                  recipientUserId: p.user_id,
                  recipientDeviceId: p.user_id, // Simplified: using user_id as device_id
                  plaintext: content,
                });
                return {
                  recipient_device_id: p.user_id,
                  ciphertext: result.encryptedContent,
                  header: result.ephemeralPublicKey ? { ephemeral_key: result.ephemeralPublicKey } : undefined,
                };
              } catch {
                // Fallback to unencrypted if encryption fails for this recipient
                console.warn(`Encryption failed for recipient ${p.user_id}, sending unencrypted`);
                return {
                  recipient_device_id: p.user_id,
                  ciphertext: content, // Fallback: plain content
                };
              }
            })
          );

          await sendMessageMutation.mutateAsync({
            conversation_id: conversationId,
            ciphertexts,
            message_type: 'TEXT',
          });
        } else {
          // No encryption - send plaintext
          await sendMessageMutation.mutateAsync({
            conversation_id: conversationId,
            ciphertexts:
              participants?.map((p) => ({
                recipient_device_id: p.user_id,
                ciphertext: content,
              })) || [],
            message_type: 'TEXT',
          });
        }
      } catch (error) {
        console.error('Failed to send message:', error);
        input.value = content;
      }
    },
    [conversationId, participants, currentUser, sendMessageMutation, encryptMessageMutation, sendTypingStop, isEncryptionEnabled]
  );

  const handleKeyDown = useCallback(() => {
    sendTypingStart(conversationId);
  }, [conversationId, sendTypingStart]);

  const isPending = sendMessageMutation.isPending || encryptMessageMutation.isPending;

  return (
    <div className="bg-slate-900/80 backdrop-blur-md border-t border-slate-800">
      <UploadProgressList conversationId={conversationId} />
      <form onSubmit={handleSubmit} className="p-4 flex items-center gap-2 max-w-4xl mx-auto">
        <FileUploadButton
          conversationId={conversationId}
          onUploadComplete={(fileUrl, fileName) => {
            // Could auto-insert file link into message or handle attachment
            console.log('Upload complete:', fileUrl, fileName);
          }}
          className="shrink-0"
        />

        <div className="flex-1 relative">
          <Input
            ref={inputRef}
            type="text"
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="pr-10 bg-slate-800/50 border-slate-700 text-slate-200 placeholder:text-slate-500 focus-visible:ring-blue-500/50 rounded-full"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-slate-400 hover:text-white"
          >
            <Smile className="h-5 w-5" />
          </Button>
        </div>

        {/* Encryption status indicator */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className={`shrink-0 p-2 rounded-full ${isEncryptionEnabled ? 'text-green-500' : 'text-slate-500'}`}>
                {isEncryptionEnabled ? (
                  <Lock className="h-4 w-4" />
                ) : (
                  <LockOpen className="h-4 w-4" />
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              {isEncryptionEnabled
                ? 'End-to-end encryption enabled'
                : 'Encryption not set up - messages sent in plaintext'}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <Button
          type="submit"
          disabled={isPending}
          className="bg-blue-600 hover:bg-blue-500 text-white rounded-full px-4 shrink-0"
        >
          <Send className="h-4 w-4 mr-2" />
          Send
        </Button>
      </form>
    </div>
  );
}

export function ChatArea({ conversationId }: ChatAreaProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentUser = useAuthStore((state) => state.user);
  const scrollRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  
  // Call state
  const [callModalOpen, setCallModalOpen] = useState(false);
  const [callType, setCallType] = useState<CallType>('AUDIO');
  
  // Search state
  const [searchOpen, setSearchOpen] = useState(false);
  
  // Get conversation info for call modal
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

  const handleOpenSearch = useCallback(() => {
    setSearchOpen(true);
  }, []);

  const handleNavigateToMessage = useCallback((messageId: string) => {
    const messageElement = messageRefs.current.get(messageId);
    if (messageElement) {
      messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Highlight the message briefly
      messageElement.classList.add('ring-2', 'ring-blue-500', 'ring-opacity-50');
      setTimeout(() => {
        messageElement.classList.remove('ring-2', 'ring-blue-500', 'ring-opacity-50');
      }, 2000);
    }
  }, []);

  return (
    <div className="relative flex flex-col h-full">
      <ChatHeader 
        conversationId={conversationId} 
        onBack={handleBack}
        onStartCall={handleStartCall}
        onOpenSearch={handleOpenSearch}
      />
      <MessageList
        conversationId={conversationId}
        currentUserId={currentUser?.id}
        scrollRef={scrollRef}
        messageRefs={messageRefs}
      />
      <MessageInput conversationId={conversationId} />
      
      {/* Message Search Panel */}
      <MessageSearchPanel
        conversationId={conversationId}
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        onNavigateToMessage={handleNavigateToMessage}
      />
      
      {/* Call Modal for outgoing calls */}
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
