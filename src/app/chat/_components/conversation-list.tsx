'use client';

import { useState, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useConversations } from '@/queries/use-conversation-queries';
import { ConversationItem, ConversationListSkeleton } from './conversation-item';
import { SearchInput } from '@/components/shared/search-input';
import { UserMenu } from '@/components/shared/user-menu';
import { NewConversationDialog } from '@/components/shared/new-conversation-dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Settings, MessageSquarePlus } from 'lucide-react';
import Link from 'next/link';

export function ConversationList() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedId = searchParams.get('conversation');
  const searchQuery = searchParams.get('search') || '';
  const [newChatOpen, setNewChatOpen] = useState(false);

  const { data: conversations, isLoading } = useConversations();

  const filteredConversations = useMemo(() => {
    if (!searchQuery || !conversations) return conversations;
    const query = searchQuery.toLowerCase();
    return conversations.filter(
      (conv) =>
        conv.subject?.toLowerCase().includes(query) ||
        conv.description?.toLowerCase().includes(query) ||
        conv.last_message?.content?.toLowerCase().includes(query)
    );
  }, [conversations, searchQuery]);

  const handleSelect = (id: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('conversation', id);
    router.push(`?${params.toString()}`, { scroll: false });
  };

  const handleSearch = (value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value) params.set('search', value);
    else params.delete('search');
    router.push(`?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border-r border-slate-800">
      <div className="p-4 border-b border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h1 className="text-lg font-semibold text-white">Sentinel Chat</h1>
          </div>
          <UserMenu />
        </div>

        <div className="flex gap-2">
          <SearchInput value={searchQuery} onChange={handleSearch} placeholder="Search conversations..." className="flex-1" />
          <Button size="icon" variant="ghost" className="text-slate-400 hover:text-white hover:bg-blue-600/20 shrink-0" onClick={() => setNewChatOpen(true)}>
            <MessageSquarePlus className="h-5 w-5" />
          </Button>
          <Button size="icon" variant="ghost" className="text-slate-400 hover:text-white shrink-0" asChild>
            <Link href="/settings">
              <Settings className="h-5 w-5" />
            </Link>
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        {isLoading ? (
          <ConversationListSkeleton />
        ) : filteredConversations?.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-slate-500 text-sm">
              {searchQuery ? 'No conversations found' : 'No conversations yet'}
            </p>
          </div>
        ) : (
          <div className="pb-4">
            {filteredConversations?.map((conversation) => (
              <ConversationItem
                key={conversation.id}
                conversation={conversation}
                isSelected={selectedId === conversation.id}
                onClick={() => handleSelect(conversation.id)}
              />
            ))}
          </div>
        )}
      </ScrollArea>

      <NewConversationDialog open={newChatOpen} onOpenChange={setNewChatOpen} />
    </div>
  );
}
