'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { MessageSquarePlus, Settings, Sparkles } from 'lucide-react';
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
      <div className="border-b border-border bg-card/90 px-4 pb-4 pt-5 backdrop-blur-xl">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Sentinel Inbox</p>
            <div>
              <p className="text-[24px] font-semibold tracking-[-0.05em] text-foreground">Chat threads</p>
              <p className="text-sm text-muted-foreground">Conversations organized like a calm workspace.</p>
            </div>
          </div>
          <UserMenu />
        </div>

        <div className="flex items-center gap-2">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Search threads, people, or subjects"
            className="flex-1"
          />
          <Button type="button" variant="outline" size="icon" className="rounded-2xl border-border bg-background" onClick={() => setDialogOpen(true)}>
            <MessageSquarePlus className="size-4" />
          </Button>
          <Button asChild type="button" variant="outline" size="icon" className="rounded-2xl border-border bg-background">
            <Link href="/settings">
              <Settings className="size-4" />
            </Link>
          </Button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
          <div className="rounded-[20px] border border-border bg-background px-3 py-3 shadow-sm">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em]">Visible</div>
            <p className="mt-2 text-lg font-semibold tracking-[-0.04em] text-foreground">{filteredConversations.length}</p>
            <p>Visible threads</p>
          </div>
          <div className="rounded-[20px] border border-border bg-background px-3 py-3 shadow-sm">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em]">
              <Sparkles className="size-3.5 text-primary" />
              Live filter
            </div>
            <p className="mt-2 text-sm font-medium text-foreground">Fast retrieval</p>
            <p>Search titles, previews, and descriptions.</p>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1">
        {conversationsQuery.isLoading ? (
          <ConversationListSkeleton />
        ) : conversationsQuery.isError ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm font-medium">Unable to load conversations</p>
            <p className="mt-1 text-sm text-muted-foreground">Check your connection and refresh the page.</p>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm font-medium">{query ? 'No matching conversations' : 'No conversations yet'}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {query ? 'Try another search term.' : 'Use the new chat button to start talking to your contacts.'}
            </p>
          </div>
        ) : (
            <div className="space-y-2 p-3">
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
