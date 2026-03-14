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
    <div className="page-shell">
      <div className="dashboard-frame lg:grid lg:grid-cols-[340px_minmax(0,1fr)]">
        <aside className={hasConversation ? 'hidden border-r border-border/70 lg:flex' : 'flex border-r border-border/70'}>
          <ConversationList selectedConversationId={selectedConversationId} />
        </aside>

        <section className={hasConversation ? 'flex min-h-[calc(100vh-2rem)] min-w-0 flex-col' : 'hidden min-w-0 lg:flex lg:min-h-[calc(100vh-2rem)] lg:flex-col'}>
          {selectedConversationId ? <ChatArea conversationId={selectedConversationId} /> : <ChatEmptyState />}
        </section>
      </div>
    </div>
  );
}
