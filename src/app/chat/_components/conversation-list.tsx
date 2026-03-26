'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Filter, MessageSquarePlus, MoreVertical, Search, Users } from 'lucide-react';
import { UserMenu } from '@/components/shared/user-menu';
import { NewConversationDialog } from '@/components/shared/new-conversation-dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getConversationSubtitle, getConversationTitle } from '@/lib/utils';
import { useConversations } from '@/queries/use-conversation-queries';
import { useAuthStore } from '@/stores/auth-store';
import { useSocket } from '@/providers/socket-provider';
import { ConversationItem, ConversationListSkeleton } from './conversation-item';

interface ConversationListProps {
  selectedConversationId: string | null;
}

export function ConversationList({ selectedConversationId }: ConversationListProps) {
  const socket = useSocket();
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
    <div className="flex h-full flex-col">
      {/* Header - WhatsApp style */}
      <header className="flex h-[59px] items-center justify-between border-b border-[#e9edef] bg-[#f0f2f5] px-4 dark:border-[#2a3942] dark:bg-[#202c33]">
        <UserMenu />
        
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full text-muted-foreground hover:bg-muted"
            onClick={() => setDialogOpen(true)}
            aria-label="New group"
          >
            <Users className="h-5 w-5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full text-muted-foreground hover:bg-muted"
            onClick={() => setDialogOpen(true)}
            aria-label="New conversation"
          >
            <MessageSquarePlus className="h-5 w-5" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-full text-muted-foreground hover:bg-muted"
                aria-label="Conversation list actions"
              >
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem onClick={() => setDialogOpen(true)}>
                New group
              </DropdownMenuItem>
              <DropdownMenuItem>New community</DropdownMenuItem>
              <DropdownMenuItem>Starred messages</DropdownMenuItem>
              <DropdownMenuItem>Select chats</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/settings">Settings</Link>
              </DropdownMenuItem>
              <DropdownMenuItem>Log out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Search bar */}
      <div className="border-b border-[#e9edef] bg-[#f0f2f5] px-3 py-2 dark:border-[#2a3942] dark:bg-[#111b21]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search or start new chat"
            className="input-whatsapp h-[35px] w-full rounded-lg bg-white pl-10 pr-10 text-sm focus:outline-none focus:ring-1 focus:ring-primary/30 dark:bg-[#202c33]"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 text-muted-foreground"
            aria-label="Filter conversations"
          >
            <Filter className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Filter tabs - WhatsApp style */}
      <div className="flex gap-2 border-b border-[#e9edef] bg-white px-3 py-2 dark:border-[#2a3942] dark:bg-[#111b21]">
        <button className="rounded-full bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary">
          All
        </button>
        <button className="rounded-full bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted/80">
          Unread
        </button>
        <button className="rounded-full bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted/80">
          Groups
        </button>
      </div>

      {/* Connection status indicator */}
      {!socket.connected && (
        <div className="flex items-center gap-2 bg-amber-500/10 px-4 py-2 text-xs text-amber-600 dark:text-amber-400">
          <span className="h-2 w-2 animate-pulse rounded-full bg-amber-500" />
          Connecting...
        </div>
      )}

      {/* Conversation list */}
      <ScrollArea className="flex-1">
        {conversationsQuery.isLoading ? (
          <ConversationListSkeleton />
        ) : conversationsQuery.isError ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm font-medium text-foreground">Unable to load chats</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Check your connection and refresh.
            </p>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm font-medium text-foreground">
              {query ? 'No chats found' : 'No chats yet'}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {query ? 'Try a different search.' : 'Start a new conversation.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#f0f2f5] dark:divide-[#202c33]">
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
