'use client';

import { useRef, useCallback, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useConversation, useConversationParticipants } from '@/queries/use-conversation-queries';
import { useMessages, useSendMessage } from '@/queries/use-message-queries';
import { useSocket } from '@/providers/socket-provider';
import { useChatStore } from '@/stores/chat-store';
import { MessageBubble } from '@/components/shared/message-bubble';
import { UserAvatar } from '@/components/shared/user-avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { useAuthStore } from '@/stores/auth-store';
import { Message } from '@/types';
import {
  MoreVertical,
  Phone,
  Video,
  ArrowLeft,
  Send,
  Paperclip,
  Smile,
} from 'lucide-react';

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
}: {
  conversationId: string;
  onBack?: () => void;
}) {
  const { data: conversation } = useConversation(conversationId);
  const { data: participants } = useConversationParticipants(conversationId);
  const typingUsers = useChatStore(
    (state) => state.typingUsers.get(conversationId) || []
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
        >
          <Phone className="h-5 w-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="text-slate-400 hover:text-white"
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
            <DropdownMenuItem>Search Messages</DropdownMenuItem>
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
}: {
  conversationId: string;
  currentUserId: string | undefined;
  scrollRef: React.RefObject<HTMLDivElement | null>;
}) {
  const { data: messages, isLoading } = useMessages(conversationId);
  const groupedMessages = useGroupedMessages(messages, currentUserId);

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
        <MessageBubble
          key={message.id}
          message={message}
          isOwn={isOwn}
          showAvatar={showAvatar}
          status={isOwn ? 'sent' : undefined}
        />
      ))}
      <div ref={scrollRef} />
    </div>
  );
}

function MessageInput({ conversationId }: { conversationId: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const sendMessageMutation = useSendMessage();
  const { sendTypingStart, sendTypingStop } = useSocket();
  const { data: participants } = useConversationParticipants(conversationId);

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const input = inputRef.current;
      if (!input || !input.value.trim()) return;

      const content = input.value.trim();
      input.value = '';

      sendTypingStop(conversationId);

      try {
        await sendMessageMutation.mutateAsync({
          conversation_id: conversationId,
          ciphertexts:
            participants?.map((p) => ({
              recipient_device_id: p.user_id,
              ciphertext: content,
            })) || [],
          message_type: 'TEXT',
        });
      } catch (error) {
        console.error('Failed to send message:', error);
        input.value = content;
      }
    },
    [conversationId, participants, sendMessageMutation, sendTypingStop]
  );

  const handleKeyDown = useCallback(() => {
    sendTypingStart(conversationId);
  }, [conversationId, sendTypingStart]);

  return (
    <div className="p-4 bg-slate-900/80 backdrop-blur-md border-t border-slate-800">
      <form onSubmit={handleSubmit} className="flex items-center gap-2 max-w-4xl mx-auto">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="text-slate-400 hover:text-white shrink-0"
        >
          <Paperclip className="h-5 w-5" />
        </Button>

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

        <Button
          type="submit"
          disabled={sendMessageMutation.isPending}
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

  const handleBack = useCallback(() => {
    const params = new URLSearchParams(searchParams);
    params.delete('conversation');
    router.push(`?${params.toString()}`, { scroll: false });
  }, [router, searchParams]);

  return (
    <>
      <ChatHeader conversationId={conversationId} onBack={handleBack} />
      <MessageList
        conversationId={conversationId}
        currentUserId={currentUser?.id}
        scrollRef={scrollRef}
      />
      <MessageInput conversationId={conversationId} />
    </>
  );
}
