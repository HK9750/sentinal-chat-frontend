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
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-600 border-t-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {conversations?.length === 0 ? (
        <div className="p-8 text-center">
          <p className="text-slate-500 text-sm">No conversations yet</p>
        </div>
      ) : (
        conversations?.map((conversation) => (
          <button
            key={conversation.id}
            onClick={() => onSelect(conversation.id)}
            className={`w-full p-4 flex items-center space-x-3 transition-all duration-200 ${
              selectedId === conversation.id 
                ? 'bg-blue-600/10 border-l-4 border-blue-500' 
                : 'hover:bg-slate-800/50 border-l-4 border-transparent'
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
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center">
                  <span className="text-slate-300 font-medium text-sm">
                    {getInitials(conversation.subject || 'Chat')}
                  </span>
                </div>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 text-left">
              <div className="flex justify-between items-start">
                <h3 className="text-sm font-medium text-slate-200 truncate">
                  {conversation.subject || (conversation.type === 'DM' ? 'Direct Message' : 'Group Chat')}
                </h3>
                {conversation.last_message_at && (
                  <span className="text-xs text-slate-500">
                    {formatRelativeTime(conversation.last_message_at)}
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-500 truncate mt-0.5">
                {conversation.last_message?.content || conversation.description || 'No messages yet'}
              </p>
            </div>

            {/* Unread badge */}
            {conversation.unread_count ? (
              <div className="flex-shrink-0">
                <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-bold text-white bg-blue-600 rounded-full">
                  {conversation.unread_count > 99 ? '99+' : conversation.unread_count}
                </span>
              </div>
            ) : null}
          </button>
        ))
      )}
    </div>
  );
}
