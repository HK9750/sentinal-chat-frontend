'use client';

import { ConversationList } from './conversation-list';
import { ChatArea } from './chat-area';
import { ChatEmptyState } from './chat-empty-state';

interface ChatShellProps {
  selectedConversationId: string | null;
}

export function ChatShell({ selectedConversationId }: ChatShellProps) {
  const hasConversation = Boolean(selectedConversationId);

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-[#d9dbd5] dark:bg-[#0b141a]">
      {/* WhatsApp-style header bar color at top */}
      <div className="absolute inset-x-0 top-0 h-[127px] bg-[#00a884] dark:bg-[#111b21]" />
      
      {/* Main container */}
      <div className="relative z-10 mx-auto flex h-full w-full max-w-[1600px] flex-col lg:px-5 lg:py-5">
        <div className="flex h-full flex-1 overflow-hidden bg-white shadow-xl lg:rounded-sm dark:bg-[#111b21]">
          {/* Sidebar / Conversation List */}
          <aside
            className={
              hasConversation
                ? 'hidden h-full w-full flex-col border-r border-border bg-sidebar lg:flex lg:w-[400px] lg:min-w-[340px]'
                : 'flex h-full w-full flex-col border-r border-border bg-sidebar lg:w-[400px] lg:min-w-[340px]'
            }
          >
            <ConversationList selectedConversationId={selectedConversationId} />
          </aside>

          {/* Chat Area */}
          <section
            className={
              hasConversation
                ? 'flex h-full min-w-0 flex-1 flex-col'
                : 'hidden h-full min-w-0 flex-1 flex-col lg:flex'
            }
          >
            {selectedConversationId ? (
              <ChatArea key={selectedConversationId} conversationId={selectedConversationId} />
            ) : (
              <ChatEmptyState />
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
