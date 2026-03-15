'use client';

import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Search, UserPlus, Users } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserAvatar } from '@/components/shared/user-avatar';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useCreateConversation } from '@/queries/use-conversation-queries';
import { useAddContact, useContacts, useSearchUsers } from '@/queries/use-user-queries';
import { cn, toErrorMessage } from '@/lib/utils';
import type { Contact, UserSearchResult } from '@/types';

function getPersonSubLabel(person: Contact | UserSearchResult): string {
  if (person.username) {
    return `@${person.username}`;
  }

  if (person.email) {
    return person.email;
  }

  return person.is_online ? 'Online now' : 'Available for secure chat';
}

interface NewConversationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function ContactRow({
  label,
  sublabel,
  isOnline,
  avatarUrl,
  fallback,
  action,
}: {
  label: string;
  sublabel: string;
  isOnline: boolean;
  avatarUrl?: string | null;
  fallback: string;
  action: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl px-3 py-3 hover:bg-muted/50">
      <UserAvatar src={avatarUrl} alt={label} fallback={fallback} size="md" showStatus isOnline={isOnline} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{label}</p>
        <p className="truncate text-xs text-muted-foreground">{sublabel}</p>
      </div>
      {action}
    </div>
  );
}

export function NewConversationDialog({ open, onOpenChange }: NewConversationDialogProps) {
  const router = useRouter();
  const createConversation = useCreateConversation();
  const addContact = useAddContact();
  const { data: contacts = [] } = useContacts();
  const [tab, setTab] = useState<'direct' | 'group'>('direct');
  const [searchQuery, setSearchQuery] = useState('');
  const [groupName, setGroupName] = useState('');
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const debouncedQuery = useDebouncedValue(searchQuery, 300);
  const searchResultsQuery = useSearchUsers(debouncedQuery, { enabled: open && debouncedQuery.trim().length > 0 });

  const visibleContacts = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return contacts;
    }

    return contacts.filter((contact) => {
      return [contact.display_name, contact.username ?? '', contact.email ?? '', contact.nickname ?? '']
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery);
    });
  }, [contacts, searchQuery]);

  const selectableGroupUsers = useMemo(() => {
    const seen = new Set<string>();
    const merged: Array<Contact | UserSearchResult> = [];

    for (const contact of contacts) {
      if (seen.has(contact.id)) {
        continue;
      }
      seen.add(contact.id);
      merged.push(contact);
    }

    for (const result of searchResultsQuery.data ?? []) {
      if (seen.has(result.id)) {
        continue;
      }
      seen.add(result.id);
      merged.push(result);
    }

    return merged;
  }, [contacts, searchResultsQuery.data]);

  const reset = useCallback(() => {
    setTab('direct');
    setSearchQuery('');
    setGroupName('');
    setSelectedGroupIds([]);
    setError(null);
  }, []);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        reset();
      }
      onOpenChange(nextOpen);
    },
    [onOpenChange, reset]
  );

  const openConversation = useCallback(
    async (participantIds: string[], subject?: string) => {
      setError(null);

      try {
        const conversation = await createConversation.mutateAsync({
          type: participantIds.length > 1 ? 'GROUP' : 'DM',
          subject,
          participant_ids: participantIds,
        });
        handleOpenChange(false);
        router.push(`/chat?conversation=${conversation.id}`, { scroll: false });
      } catch (createError) {
        setError(toErrorMessage(createError, 'Unable to create the conversation.'));
      }
    },
    [createConversation, handleOpenChange, router]
  );

  const handleCreateDirectConversation = useCallback(
    async (targetUserId: string) => {
      await openConversation([targetUserId]);
    },
    [openConversation]
  );

  const handleAddContact = useCallback(
    async (userId: string) => {
      setError(null);
      try {
        await addContact.mutateAsync({ contact_user_id: userId });
      } catch (contactError) {
        setError(toErrorMessage(contactError, 'Unable to add that contact right now.'));
      }
    },
    [addContact]
  );

  const handleToggleGroupUser = useCallback((userId: string) => {
    setSelectedGroupIds((current) =>
      current.includes(userId) ? current.filter((item) => item !== userId) : [...current, userId]
    );
  }, []);

  const handleCreateGroup = useCallback(async () => {
    if (!groupName.trim()) {
      setError('Give the group a name first.');
      return;
    }

    if (selectedGroupIds.length < 2) {
      setError('Select at least two participants for a group chat.');
      return;
    }

    await openConversation(selectedGroupIds, groupName.trim());
  }, [groupName, openConversation, selectedGroupIds]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl border-border/70 bg-background/95 p-0 shadow-[0_28px_100px_-36px_rgba(15,23,42,0.55)] backdrop-blur-xl">
        <DialogHeader className="border-b border-border/70 px-6 py-5">
          <DialogTitle className="text-xl tracking-[-0.04em]">Start a new chat</DialogTitle>
          <DialogDescription>
            Search people, add them to contacts, and create direct or group conversations without leaving chat.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-6 pt-4">
          <div className="rounded-[28px] border border-border/70 bg-muted/30 p-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search by name, username, or email"
                className="h-12 rounded-[22px] border-transparent bg-background pl-11 shadow-none"
              />
            </div>
          </div>

          <Tabs value={tab} onValueChange={(value) => setTab(value as 'direct' | 'group')} className="mt-4 gap-4">
            <TabsList className="grid w-full grid-cols-2 rounded-[20px] bg-muted/40 p-1">
              <TabsTrigger value="direct" className="rounded-[16px]">
                Direct chat
              </TabsTrigger>
              <TabsTrigger value="group" className="rounded-[16px]">
                Group chat
              </TabsTrigger>
            </TabsList>

            <TabsContent value="direct" className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <div className="rounded-[24px] border border-border/70 bg-background/60 p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">Contacts</p>
                      <p className="text-xs text-muted-foreground">Fastest way to start a direct chat</p>
                    </div>
                    <span className="rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">{visibleContacts.length}</span>
                  </div>

                  <div className="max-h-[360px] space-y-1 overflow-y-auto">
                    {visibleContacts.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
                        No contacts match that search yet.
                      </div>
                    ) : (
                      visibleContacts.map((contact) => (
                        <ContactRow
                          key={contact.id}
                          label={contact.nickname || contact.display_name}
                          sublabel={getPersonSubLabel(contact)}
                          isOnline={contact.is_online}
                          avatarUrl={contact.avatar_url}
                          fallback={contact.display_name[0] ?? 'C'}
                          action={
                            <Button size="sm" className="rounded-full" onClick={() => void handleCreateDirectConversation(contact.id)}>
                              Chat
                            </Button>
                          }
                        />
                      ))
                    )}
                  </div>
                </div>

                <div className="rounded-[24px] border border-border/70 bg-background/60 p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">People search</p>
                      <p className="text-xs text-muted-foreground">Debounced backend search</p>
                    </div>
                    {searchResultsQuery.isFetching ? <span className="text-xs text-muted-foreground">Searching...</span> : null}
                  </div>

                  <div className="max-h-[360px] space-y-1 overflow-y-auto">
                    {searchResultsQuery.isError ? (
                      <div className="rounded-2xl border border-dashed border-destructive/30 px-4 py-10 text-center text-sm text-destructive">
                        Search failed. Try again in a moment.
                      </div>
                    ) : !debouncedQuery.trim() ? (
                      <div className="rounded-2xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
                        Start typing to search all users.
                      </div>
                    ) : (searchResultsQuery.data ?? []).length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
                        No users found for that search.
                      </div>
                    ) : (
                      (searchResultsQuery.data ?? []).map((person) => (
                        <ContactRow
                          key={person.id}
                          label={person.nickname || person.display_name}
                          sublabel={getPersonSubLabel(person)}
                          isOnline={person.is_online}
                          avatarUrl={person.avatar_url}
                          fallback={person.display_name[0] ?? 'U'}
                          action={
                            <div className="flex items-center gap-2">
                              {!person.is_contact ? (
                                <Button
                                  size="icon-sm"
                                  variant="outline"
                                  className="rounded-full"
                                  onClick={() => void handleAddContact(person.id)}
                                  disabled={addContact.isPending || createConversation.isPending}
                                >
                                  <UserPlus className="size-4" />
                                </Button>
                              ) : null}
                              <Button
                                size="sm"
                                className="rounded-full"
                                onClick={() => void handleCreateDirectConversation(person.id)}
                                disabled={createConversation.isPending}
                              >
                                Chat
                              </Button>
                            </div>
                          }
                        />
                      ))
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="group" className="space-y-4">
              <div className="rounded-[24px] border border-border/70 bg-background/60 p-4">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Users className="size-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Create a group</p>
                    <p className="text-xs text-muted-foreground">Pick participants from contacts or search results</p>
                  </div>
                </div>

                <Input
                  value={groupName}
                  onChange={(event) => setGroupName(event.target.value)}
                  placeholder="Group name"
                  className="h-11 rounded-[18px]"
                />

                <div className="mt-4 max-h-[320px] space-y-1 overflow-y-auto rounded-[20px] border border-border/70 p-2">
                  {selectableGroupUsers.length === 0 ? (
                    <div className="px-4 py-10 text-center text-sm text-muted-foreground">
                      Search or add contacts to build a group.
                    </div>
                  ) : (
                    selectableGroupUsers.map((person) => {
                      const isSelected = selectedGroupIds.includes(person.id);
                      return (
                        <button
                          key={person.id}
                          type="button"
                          onClick={() => handleToggleGroupUser(person.id)}
                          className={cn(
                            'flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition-colors',
                            isSelected ? 'bg-primary/10' : 'hover:bg-muted/50'
                          )}
                        >
                          <UserAvatar
                            src={person.avatar_url}
                            alt={person.display_name}
                            fallback={person.display_name[0] ?? 'U'}
                            size="md"
                            showStatus
                            isOnline={person.is_online}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{person.nickname || person.display_name}</p>
                            <p className="truncate text-xs text-muted-foreground">{getPersonSubLabel(person)}</p>
                          </div>
                          <div
                            className={cn(
                              'h-5 w-5 rounded-full border transition-colors',
                              isSelected ? 'border-primary bg-primary' : 'border-border bg-background'
                            )}
                          />
                        </button>
                      );
                    })
                  )}
                </div>

                <div className="mt-4 flex items-center justify-between gap-3">
                  <p className="text-xs text-muted-foreground">
                    {selectedGroupIds.length > 0
                      ? `${selectedGroupIds.length} participant${selectedGroupIds.length === 1 ? '' : 's'} selected`
                      : 'No participants selected yet'}
                  </p>
                  <Button onClick={() => void handleCreateGroup()} disabled={selectedGroupIds.length < 2 || !groupName.trim() || createConversation.isPending}>
                    Create group
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="mt-4 text-xs text-muted-foreground">
            Contacts are stored server-side. Search is debounced before each backend request, while encrypted message content search stays local inside a conversation.
          </div>

          {error ? (
            <div className="mt-4 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 size-4" />
                {error}
              </div>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
