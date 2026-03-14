'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Archive, MessageSquarePlus, Settings } from 'lucide-react';
import { SearchInput } from '@/components/shared/search-input';
import { UserMenu } from '@/components/shared/user-menu';
import { NewConversationDialog } from '@/components/shared/new-conversation-dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getConversationSubtitle, getConversationTitle } from '@/lib/utils';
import { useConversations } from '@/queries/use-conversation-queries';
import { useAuthStore } from '@/stores/auth-store';
import { ConversationItem, ConversationListSkeleton } from './conversation-item';

interface ConversationListProps {
  selectedConversationId: string | null;
}

export function ConversationList({ selectedConversationId }: ConversationListProps) {
  const currentUserId = useAuthStore((state) => state.user?.id);
  const [query, setQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const conversationsQuery = useConversations();

  const filteredConversations = useMemo(() => {
    const conversations = conversationsQuery.data?.items ?? [];
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return conversations;
    }

    return conversations.filter((conversation) => {
      const haystack = [
        getConversationTitle(conversation, currentUserId),
        getConversationSubtitle(conversation, currentUserId),
        conversation.description ?? '',
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    });
  }, [conversationsQuery.data?.items, currentUserId, query]);

  return (
    <div className="flex min-h-full w-full flex-col">
      <div className="border-b border-border/70 bg-background/85 px-4 pb-3 pt-4 backdrop-blur-xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-[22px] font-semibold tracking-[-0.04em] text-foreground">Chats</p>
          </div>
          <UserMenu />
        </div>

        <div className="flex items-center gap-2">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Search or start new chat"
            className="flex-1"
          />
          <Button type="button" variant="outline" size="icon" className="rounded-full" onClick={() => setDialogOpen(true)}>
            <MessageSquarePlus className="size-4" />
          </Button>
          <Button asChild type="button" variant="outline" size="icon" className="rounded-full">
            <Link href="/settings">
              <Settings className="size-4" />
            </Link>
          </Button>
        </div>

        <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-emerald-500/12 px-2 py-1 text-emerald-700">Encrypted</span>
            <span>{filteredConversations.length} visible</span>
          </div>
          <div className="flex items-center gap-1">
            <Archive className="size-3.5" />
            Search chats instantly
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1">
        {conversationsQuery.isLoading ? (
          <ConversationListSkeleton />
        ) : filteredConversations.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm font-medium">{query ? 'No matching conversations' : 'No conversations yet'}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {query ? 'Try another search term.' : 'Use the new chat button to start talking to your contacts.'}
            </p>
          </div>
        ) : (
          <div>
            {filteredConversations.map((conversation) => (
              <ConversationItem
                key={conversation.id}
                conversation={conversation}
                isSelected={selectedConversationId === conversation.id}
              />
            ))}
          </div>
        )}
      </ScrollArea>

      <NewConversationDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
