'use client';

import { useState, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Search,
  X,
  Users,
  MessageSquare,
  Check,
  Loader2,
  UserPlus,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { UserAvatar } from '@/components/shared/user-avatar';
import { useSearchUsers, useContacts } from '@/queries/use-user-queries';
import { useGetOrCreateDM, useCreateConversation } from '@/queries/use-conversation-queries';
import { useAuthStore } from '@/stores/auth-store';
import { useDebounce } from '@/hooks/use-debounce';
import { cn } from '@/lib/utils';
import type { User, UserContact } from '@/types';

interface NewConversationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewConversationDialog({
  open,
  onOpenChange,
}: NewConversationDialogProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentUser = useAuthStore((state) => state.user);

  const [tab, setTab] = useState<'dm' | 'group'>('dm');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [groupName, setGroupName] = useState('');

  const debouncedSearch = useDebounce(searchQuery, 300);

  const { data: contacts, isLoading: contactsLoading } = useContacts();
  const { data: searchResults, isLoading: searchLoading } = useSearchUsers(
    debouncedSearch,
    { enabled: debouncedSearch.length >= 2 }
  );

  const getOrCreateDM = useGetOrCreateDM();
  const createConversation = useCreateConversation();

  const displayUsers = useMemo(() => {
    const users: User[] = [];
    const seenIds = new Set<string>();

    if (debouncedSearch.length >= 2 && searchResults) {
      searchResults.forEach((user) => {
        if (user.id !== currentUser?.id && !seenIds.has(user.id)) {
          users.push(user);
          seenIds.add(user.id);
        }
      });
    } else if (contacts) {
      contacts.forEach((contact) => {
        const user = contact.contact;
        if (user && user.id !== currentUser?.id && !seenIds.has(user.id)) {
          users.push(user);
          seenIds.add(user.id);
        } else if (!user && contact.contact_user_id !== currentUser?.id && !seenIds.has(contact.contact_user_id)) {
          users.push({
            id: contact.contact_user_id,
            email: '',
            username: contact.nickname || contact.contact_user_id,
            display_name: contact.nickname || contact.contact_user_id,
          });
          seenIds.add(contact.contact_user_id);
        }
      });
    }

    return users;
  }, [contacts, searchResults, debouncedSearch, currentUser?.id]);

  const handleToggleUser = useCallback((user: User) => {
    setSelectedUsers((prev) => {
      const isSelected = prev.some((u) => u.id === user.id);
      if (isSelected) {
        return prev.filter((u) => u.id !== user.id);
      }
      return [...prev, user];
    });
  }, []);

  const handleStartDM = useCallback(
    async (user: User) => {
      if (!currentUser?.id) {
        console.error('Cannot start DM: currentUser.id is not available');
        return;
      }

      try {
        const conversation = await getOrCreateDM.mutateAsync({
          currentUserId: currentUser.id,
          targetUserId: user.id,
        });

        if (conversation) {
          const params = new URLSearchParams(searchParams);
          params.set('conversation', conversation.id);
          router.push(`/chat?${params.toString()}`);
          onOpenChange(false);
          resetDialog();
        }
      } catch (error) {
        console.error('Failed to create DM:', error);
      }
    },
    [currentUser, getOrCreateDM, router, searchParams, onOpenChange]
  );

  const handleCreateGroup = useCallback(async () => {
    if (selectedUsers.length < 2 || !groupName.trim()) return;

    try {
      const conversation = await createConversation.mutateAsync({
        type: 'GROUP',
        subject: groupName.trim(),
        participants: selectedUsers.map((u) => u.id),
      });

      if (conversation) {
        const params = new URLSearchParams(searchParams);
        params.set('conversation', conversation.id);
        router.push(`/chat?${params.toString()}`);
        onOpenChange(false);
        resetDialog();
      }
    } catch (error) {
      console.error('Failed to create group:', error);
    }
  }, [selectedUsers, groupName, createConversation, router, searchParams, onOpenChange]);

  const resetDialog = useCallback(() => {
    setSearchQuery('');
    setSelectedUsers([]);
    setGroupName('');
    setTab('dm');
  }, []);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        resetDialog();
      }
      onOpenChange(open);
    },
    [onOpenChange, resetDialog]
  );

  const isLoading = contactsLoading || searchLoading;
  const isPending = getOrCreateDM.isPending || createConversation.isPending;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="bg-background/95 border-border backdrop-blur-xl sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl text-foreground">
            New Conversation
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Start a direct message or create a group chat
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as 'dm' | 'group')}>
          <TabsList className="grid w-full grid-cols-2 bg-muted/50">
            <TabsTrigger
              value="dm"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Direct Message
            </TabsTrigger>
            <TabsTrigger
              value="group"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Users className="h-4 w-4 mr-2" />
              Group Chat
            </TabsTrigger>
          </TabsList>

          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or username..."
              className="pl-10 pr-10 bg-background border-input text-foreground"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-foreground"
                onClick={() => setSearchQuery('')}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {tab === 'group' && selectedUsers.length > 0 && (
            <div className="mt-4 space-y-3">
              <div className="flex flex-wrap gap-2">
                {selectedUsers.map((user) => (
                  <Badge
                    key={user.id}
                    variant="secondary"
                    className="bg-primary/20 text-primary border-primary/30 pl-1 pr-2 py-1"
                  >
                    <UserAvatar user={user} size="xs" className="mr-1.5" />
                    {user.display_name || user.username}
                    <button
                      onClick={() => handleToggleUser(user)}
                      className="ml-1.5 hover:text-foreground"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <Input
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Group name (required)"
                className="bg-background border-input text-foreground"
              />
            </div>
          )}

          <TabsContent value="dm" className="mt-4">
            <ScrollArea className="h-75">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : displayUsers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground/80">
                  <UserPlus className="h-10 w-10 mb-3 opacity-50" />
                  <p className="text-sm">
                    {debouncedSearch.length >= 2
                      ? 'No users found'
                      : 'Search for users or add contacts'}
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  {displayUsers.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => handleStartDM(user)}
                      disabled={isPending}
                      className={cn(
                        'w-full flex items-center gap-3 p-3 rounded-lg transition-colors',
                        'hover:bg-muted text-left',
                        isPending && 'opacity-50 cursor-not-allowed'
                      )}
                    >
                      <UserAvatar user={user} size="md" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">
                          {user.display_name || user.username}
                        </p>
                        <p className="text-sm text-muted-foreground truncate">
                          @{user.username}
                        </p>
                      </div>
                      {user.is_online && (
                        <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="group" className="mt-4">
            <ScrollArea className="h-75">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : displayUsers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground/80">
                  <UserPlus className="h-10 w-10 mb-3 opacity-50" />
                  <p className="text-sm">
                    {debouncedSearch.length >= 2
                      ? 'No users found'
                      : 'Search for users to add to the group'}
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  {displayUsers.map((user) => {
                    const isSelected = selectedUsers.some((u) => u.id === user.id);
                    return (
                      <button
                        key={user.id}
                        onClick={() => handleToggleUser(user)}
                        className={cn(
                          'w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left',
                          isSelected
                            ? 'bg-primary/20 border-primary/30'
                            : 'hover:bg-muted border border-transparent'
                        )}
                      >
                        <UserAvatar user={user} size="md" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground truncate">
                            {user.display_name || user.username}
                          </p>
                          <p className="text-sm text-muted-foreground truncate">
                            @{user.username}
                          </p>
                        </div>
                        {isSelected ? (
                          <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                            <Check className="h-4 w-4 text-primary-foreground" />
                          </div>
                        ) : (
                          user.is_online && (
                            <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
                          )
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </ScrollArea>

            <div className="mt-4 flex justify-end">
              <Button
                onClick={handleCreateGroup}
                disabled={
                  selectedUsers.length < 2 ||
                  !groupName.trim() ||
                  isPending
                }
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Users className="h-4 w-4 mr-2" />
                )}
                Create Group ({selectedUsers.length} members)
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
