'use client';

import { useState, useRef, useEffect } from 'react';
import { useConversation, useConversationParticipants } from '@/queries/use-conversation-queries';
import { useMessages, useSendMessage } from '@/queries/use-message-queries';
import { useSocket } from '@/providers/socket-provider';
import { formatDate, getInitials } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';
import { Message } from '@/types';

interface ChatAreaProps {
  conversationId: string;
}

export function ChatArea({ conversationId }: ChatAreaProps) {
  const { data: conversation } = useConversation(conversationId);
  const { data: participants } = useConversationParticipants(conversationId);
  const { data: messages, isLoading: isLoadingMessages } = useMessages(conversationId);
  const sendMessageMutation = useSendMessage();
  const currentUser = useAuthStore((state) => state.user);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [messageInput, setMessageInput] = useState('');
  const { sendTypingStart, sendTypingStop } = useSocket();

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim()) return;

    try {
      // For now, sending without encryption (E2EE requires Signal Protocol implementation)
      await sendMessageMutation.mutateAsync({
        conversation_id: conversationId,
        ciphertexts: participants?.map((p) => ({
          recipient_device_id: p.user_id,
          ciphertext: messageInput,
        })) || [],
        message_type: 'TEXT',
      });

      setMessageInput('');
      sendTypingStop(conversationId);
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleTyping = () => {
    sendTypingStart(conversationId);
  };

  return (
    <>
      {/* Header */}
      <div className="h-16 bg-white border-b border-gray-200 flex items-center px-4">
        <div className="flex items-center space-x-3">
          {conversation?.avatar_url ? (
            <img
              src={conversation.avatar_url}
              alt={conversation.subject || 'Chat'}
              className="h-10 w-10 rounded-full object-cover"
            />
          ) : (
            <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
              <span className="text-gray-600 font-medium text-sm">
                {getInitials(conversation?.subject || 'Chat')}
              </span>
            </div>
          )}
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {conversation?.subject || 'Chat'}
            </h2>
            <p className="text-xs text-gray-500">
              {participants?.length || 0} participants
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {isLoadingMessages ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : (
          messages?.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              isOwn={message.sender_id === currentUser?.id}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="h-20 bg-white border-t border-gray-200 p-4">
        <form onSubmit={handleSendMessage} className="flex space-x-2">
          <input
            type="text"
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyDown={handleTyping}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={!messageInput.trim() || sendMessageMutation.isPending}
            className="px-6 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </form>
      </div>
    </>
  );
}

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
}

function MessageBubble({ message, isOwn }: MessageBubbleProps) {
  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[70%] px-4 py-2 rounded-2xl ${
          isOwn
            ? 'bg-blue-600 text-white rounded-br-none'
            : 'bg-white text-gray-900 rounded-bl-none shadow-sm'
        }`}
      >
        {!isOwn && message.sender && (
          <p className="text-xs font-medium text-gray-500 mb-1">
            {message.sender.display_name}
          </p>
        )}
        <p className="text-sm">{message.ciphertext || message.content}</p>
        <p
          className={`text-xs mt-1 ${
            isOwn ? 'text-blue-200' : 'text-gray-400'
          }`}
        >
          {formatDate(message.created_at)}
        </p>
      </div>
    </div>
  );
}
