'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { MessageSquarePlus, Search, Settings } from 'lucide-react';
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
      <div className="border-b border-border/70 px-4 py-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="section-kicker">Sentinel</p>
            <h1 className="mt-1 text-xl font-semibold tracking-[-0.04em]">Conversations</h1>
          </div>
          <UserMenu />
        </div>

        <div className="flex items-center gap-2">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Search titles, people, and notes"
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
      </div>

      <div className="border-b border-border/70 px-4 py-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <Search className="size-3.5" />
          Search is local to loaded conversation metadata right now.
        </div>
      </div>

      <ScrollArea className="flex-1">
        {conversationsQuery.isLoading ? (
          <ConversationListSkeleton />
        ) : filteredConversations.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm font-medium">{query ? 'No matching conversations' : 'No conversations yet'}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {query ? 'Try another search term.' : 'Create a new encrypted conversation to get started.'}
            </p>
          </div>
        ) : (
          <div className="px-2 py-2">
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
