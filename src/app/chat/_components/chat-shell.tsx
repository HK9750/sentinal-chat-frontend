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
    <div className="min-h-screen bg-background px-0 py-0 lg:p-5">
      <div className="mx-auto flex min-h-screen w-full max-w-[1680px] overflow-hidden border-x border-border bg-card shadow-2xl backdrop-blur-2xl lg:min-h-[calc(100vh-2.5rem)] lg:rounded-[30px] lg:border">
        <aside
          className={hasConversation
            ? 'hidden w-full border-r border-border bg-muted/30 lg:flex lg:max-w-[380px] xl:max-w-[420px]'
            : 'flex w-full border-r border-border bg-muted/30 lg:max-w-[380px] xl:max-w-[420px]'}
        >
          <ConversationList selectedConversationId={selectedConversationId} />
        </aside>

        <section
          className={hasConversation
            ? 'flex min-h-screen min-w-0 flex-1 flex-col bg-background'
            : 'hidden min-w-0 flex-1 bg-background lg:flex lg:min-h-[calc(100vh-2.5rem)] lg:flex-col'}
        >
          {selectedConversationId ? <ChatArea conversationId={selectedConversationId} /> : <ChatEmptyState />}
        </section>
      </div>
    </div>
  );
}
