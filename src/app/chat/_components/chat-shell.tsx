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
    <div className="min-h-screen bg-[#efeae2] px-0 py-0 lg:p-4">
      <div className="mx-auto flex min-h-screen w-full max-w-[1600px] overflow-hidden border-x border-border/40 bg-background lg:min-h-[calc(100vh-2rem)] lg:rounded-[20px] lg:border">
        <aside className={hasConversation ? 'hidden w-full border-r border-border/70 bg-[#f7f5f3] lg:flex lg:max-w-[420px]' : 'flex w-full border-r border-border/70 bg-[#f7f5f3] lg:max-w-[420px]'}>
          <ConversationList selectedConversationId={selectedConversationId} />
        </aside>

        <section className={hasConversation ? 'flex min-h-screen min-w-0 flex-1 flex-col bg-[#efeae2]' : 'hidden min-w-0 flex-1 bg-[#efeae2] lg:flex lg:min-h-[calc(100vh-2rem)] lg:flex-col'}>
          {selectedConversationId ? <ChatArea conversationId={selectedConversationId} /> : <ChatEmptyState />}
        </section>
      </div>
    </div>
  );
}
