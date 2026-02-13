'use client';

import { useConversations } from '@/queries/use-conversation-queries';
import { formatRelativeTime, getInitials } from '@/lib/utils';
import { Conversation } from '@/types';

interface ConversationListProps {
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function ConversationList({ selectedId, onSelect }: ConversationListProps) {
  const { data: conversations, isLoading } = useConversations();

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {conversations?.map((conversation) => (
        <button
          key={conversation.id}
          onClick={() => onSelect(conversation.id)}
          className={`w-full p-4 flex items-center space-x-3 hover:bg-gray-50 transition-colors ${
            selectedId === conversation.id ? 'bg-blue-50 hover:bg-blue-50' : ''
          }`}
        >
          {/* Avatar */}
          <div className="flex-shrink-0">
            {conversation.avatar_url ? (
              <img
                src={conversation.avatar_url}
                alt={conversation.subject || 'Conversation'}
                className="h-12 w-12 rounded-full object-cover"
              />
            ) : (
              <div className="h-12 w-12 rounded-full bg-gray-300 flex items-center justify-center">
                <span className="text-gray-600 font-medium">
                  {getInitials(conversation.subject || 'Chat')}
                </span>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 text-left">
            <div className="flex justify-between items-start">
              <h3 className="text-sm font-medium text-gray-900 truncate">
                {conversation.subject || (conversation.type === 'DM' ? 'Direct Message' : 'Group Chat')}
              </h3>
              {conversation.last_message_at && (
                <span className="text-xs text-gray-500">
                  {formatRelativeTime(conversation.last_message_at)}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 truncate">
              {conversation.last_message?.content || conversation.description || 'No messages yet'}
            </p>
          </div>

          {/* Unread badge */}
          {conversation.unread_count ? (
            <div className="flex-shrink-0">
              <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-blue-600 rounded-full">
                {conversation.unread_count}
              </span>
            </div>
          ) : null}
        </button>
      ))}
    </div>
  );
}
