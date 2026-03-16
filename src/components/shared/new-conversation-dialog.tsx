'use client';

import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Check, MessageSquarePlus, Search, UserPlus, Users, X } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UserAvatar } from '@/components/shared/user-avatar';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useCreateConversation } from '@/queries/use-conversation-queries';
import { useAddContact, useContacts, useSearchUsers } from '@/queries/use-user-queries';
import { cn, toErrorMessage, uniqueById } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';
import type { Contact, UserSearchResult } from '@/types';

type DialogPerson = Contact | UserSearchResult;
type ComposerMode = 'direct' | 'group';

function personLabel(person: DialogPerson): string {
  return person.nickname?.trim() || person.display_name;
}

function personMeta(person: DialogPerson): string {
  if (person.username) {
    return `@${person.username}`;
  }

  if (person.email) {
    return person.email;
  }

  return person.is_online ? 'Online now' : 'Available for secure chat';
}

function matchesPerson(person: DialogPerson, query: string): boolean {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return true;
  }

  return [person.display_name, person.username ?? '', person.email ?? '', person.nickname ?? '']
    .join(' ')
    .toLowerCase()
    .includes(normalizedQuery);
}

function PersonRow({
  person,
  trailing,
  selected = false,
}: {
  person: DialogPerson;
  trailing: React.ReactNode;
  selected?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-[24px] border px-3 py-3 transition-all',
        selected
          ? 'border-primary/25 bg-primary/8 shadow-sm'
          : 'border-border bg-background hover:bg-muted/40'
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
        <p className="truncate text-sm font-semibold text-foreground">{personLabel(person)}</p>
        <p className="truncate text-xs text-muted-foreground">{personMeta(person)}</p>
      </div>

      {trailing}
    </div>
  );
}

interface NewConversationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewConversationDialog({ open, onOpenChange }: NewConversationDialogProps) {
  const router = useRouter();
  const currentUserId = useAuthStore((state) => state.user?.id);
  const createConversation = useCreateConversation();
  const addContact = useAddContact();
  const { data: contacts = [] } = useContacts();
  const [mode, setMode] = useState<ComposerMode>('direct');
  const [query, setQuery] = useState('');
  const [groupName, setGroupName] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedPeople, setSelectedPeople] = useState<Record<string, DialogPerson>>({});
  const [error, setError] = useState<string | null>(null);

  const debouncedQuery = useDebouncedValue(query, 250);
  const searchResultsQuery = useSearchUsers(debouncedQuery, { enabled: open && debouncedQuery.trim().length > 0 });
  const hasTypedQuery = query.trim().length > 0;

  const visibleContacts = useMemo(() => {
    return contacts.filter((contact) => {
      if (contact.id === currentUserId || contact.is_blocked) {
        return false;
      }

      return matchesPerson(contact, query);
    });
  }, [contacts, currentUserId, query]);

  const remoteResults = useMemo(() => {
    return (searchResultsQuery.data ?? []).filter((person) => person.id !== currentUserId && !person.is_blocked);
  }, [currentUserId, searchResultsQuery.data]);

  const allResults = useMemo(() => {
    return uniqueById([...visibleContacts, ...remoteResults]);
  }, [remoteResults, visibleContacts]);

  const contactIds = useMemo(() => new Set(visibleContacts.map((person) => person.id)), [visibleContacts]);

  const stagedMembers = useMemo(
    () => selectedIds.map((id) => selectedPeople[id]).filter((person): person is DialogPerson => Boolean(person)),
    [selectedIds, selectedPeople]
  );

  const reset = useCallback(() => {
    setMode('direct');
    setQuery('');
    setGroupName('');
    setSelectedIds([]);
    setSelectedPeople({});
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
    async ({ participantIds, subject, type }: { participantIds: string[]; subject?: string; type: 'DM' | 'GROUP' }) => {
      setError(null);

      try {
        const conversation = await createConversation.mutateAsync({
          type,
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
      await openConversation({ participantIds: [targetUserId], type: 'DM' });
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

  const toggleMember = useCallback((person: DialogPerson) => {
    setSelectedIds((current) =>
      current.includes(person.id) ? current.filter((item) => item !== person.id) : [...current, person.id]
    );

    setSelectedPeople((current) => ({
      ...current,
      [person.id]: person,
    }));
  }, []);

  const handleCreateGroup = useCallback(async () => {
    if (!groupName.trim()) {
      setError('Give the group a name first.');
      return;
    }

    if (selectedIds.length < 1) {
      setError('Choose at least one other person for the group.');
      return;
    }

    await openConversation({ participantIds: selectedIds, subject: groupName.trim(), type: 'GROUP' });
  }, [groupName, openConversation, selectedIds]);

  const listEmptyMessage = hasTypedQuery
    ? searchResultsQuery.isFetching
      ? 'Searching the workspace...'
      : 'No people found.'
    : mode === 'direct'
      ? 'No contacts yet.'
      : 'Search people to add.';

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="h-[min(760px,calc(100vh-2rem))] overflow-hidden border-border bg-card p-0 shadow-2xl backdrop-blur-2xl sm:max-w-5xl">
        <div className="flex h-full min-h-0 flex-col">
        <DialogHeader className="border-b border-border px-6 py-5 text-left">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <DialogTitle className="text-[28px] tracking-[-0.05em]">New conversation</DialogTitle>
              <DialogDescription className="mt-2 text-sm text-muted-foreground">
                {mode === 'direct' ? 'Choose a person.' : 'Choose people and name the group.'}
              </DialogDescription>
            </div>

            <div className="flex gap-2 rounded-[22px] border border-border bg-muted/30 p-1">
              <Button
                type="button"
                variant={mode === 'direct' ? 'default' : 'ghost'}
                className="rounded-[18px]"
                onClick={() => {
                  setMode('direct');
                  setError(null);
                }}
              >
                <MessageSquarePlus className="size-4" />
                Direct
              </Button>
              <Button
                type="button"
                variant={mode === 'group' ? 'default' : 'ghost'}
                className="rounded-[18px]"
                onClick={() => {
                  setMode('group');
                  setError(null);
                }}
              >
                <Users className="size-4" />
                Group
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className={cn('grid min-h-0 flex-1 gap-0', mode === 'group' ? 'lg:grid-cols-[minmax(0,1fr)_320px]' : 'lg:grid-cols-1')}>
          <section className={cn('flex min-h-0 flex-col', mode === 'group' ? 'border-b border-border lg:border-b-0 lg:border-r' : '')}>
            <div className="border-b border-border px-6 py-4">
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={mode === 'direct' ? 'Search people' : 'Search people to add'}
                  className="h-12 rounded-[20px] border-border bg-background pl-11 pr-10"
                />
                {query ? (
                  <button
                    type="button"
                    onClick={() => setQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    aria-label="Clear search"
                  >
                    <X className="size-3.5" />
                  </button>
                ) : null}
              </div>
            </div>

            <div className="min-h-0 space-y-3 overflow-y-auto px-6 py-5">
              {allResults.length === 0 ? (
                <div className="flex min-h-[280px] items-center justify-center rounded-[28px] border border-dashed border-border bg-muted/20 px-6 text-center text-sm text-muted-foreground">
                  {listEmptyMessage}
                </div>
              ) : (
                allResults.map((person) => {
                  const isSelected = selectedIds.includes(person.id);
                  const isContact = contactIds.has(person.id);

                  return (
                    <PersonRow
                      key={person.id}
                      person={person}
                      selected={mode === 'group' && isSelected}
                      trailing={
                        mode === 'direct' ? (
                          <div className="flex items-center gap-2">
                            {!isContact ? (
                              <Button
                                type="button"
                                variant="outline"
                                size="icon-sm"
                                className="rounded-full border-border bg-background"
                                onClick={() => void handleAddContact(person.id)}
                                disabled={addContact.isPending || createConversation.isPending}
                                aria-label={`Add ${personLabel(person)} to contacts`}
                              >
                                <UserPlus className="size-4" />
                              </Button>
                            ) : null}
                            <Button
                              type="button"
                              className="rounded-full"
                              onClick={() => void handleCreateDirectConversation(person.id)}
                              disabled={createConversation.isPending}
                            >
                              Open chat
                            </Button>
                          </div>
                        ) : (
                          <Button
                            type="button"
                            variant={isSelected ? 'default' : 'outline'}
                            className="min-w-24 rounded-full"
                            onClick={() => toggleMember(person)}
                          >
                            {isSelected ? (
                              <>
                                <Check className="size-4" />
                                Added
                              </>
                            ) : (
                              'Select'
                            )}
                          </Button>
                        )
                      }
                    />
                  );
                })
              )}
            </div>
          </section>

          {mode === 'group' ? (
            <aside className="flex min-h-0 flex-col gap-4 px-6 py-5">
              <div className="rounded-[24px] border border-border bg-background p-4">
                <label className="text-sm font-semibold text-foreground">Group name</label>
                <Input
                  value={groupName}
                  onChange={(event) => setGroupName(event.target.value)}
                  placeholder="Group name"
                  className="mt-3 h-12 rounded-[18px] border-border bg-background"
                />
              </div>

              <div className="flex min-h-0 flex-1 flex-col rounded-[24px] border border-border bg-background p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-foreground">Members</p>
                    <span className="text-xs text-muted-foreground">{stagedMembers.length} selected</span>
                  </div>

                  <div className="mt-3 min-h-0 flex-1 overflow-y-auto">
                    {stagedMembers.length === 0 ? (
                      <div className="flex h-full min-h-[132px] items-center justify-center rounded-[20px] border border-dashed border-border px-4 text-center text-sm text-muted-foreground">
                        No members selected.
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {stagedMembers.map((person) => (
                          <button
                            key={person.id}
                            type="button"
                            onClick={() => toggleMember(person)}
                            className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-2.5 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                          >
                            <UserAvatar
                              src={person.avatar_url}
                              alt={person.display_name}
                              fallback={person.display_name[0] ?? 'U'}
                              size="sm"
                              showStatus
                              isOnline={person.is_online}
                            />
                            <span className="max-w-[140px] truncate">{personLabel(person)}</span>
                            <X className="size-3.5 text-muted-foreground" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                <Button
                  type="button"
                  className="mt-4 h-11 w-full rounded-[18px]"
                  disabled={selectedIds.length < 1 || !groupName.trim() || createConversation.isPending}
                  onClick={() => void handleCreateGroup()}
                >
                  {createConversation.isPending ? 'Creating...' : 'Create group'}
                </Button>
              </div>
            </aside>
          ) : null}
        </div>

        {error ? (
          <div className="border-t border-destructive/15 bg-destructive/8 px-6 py-4 text-sm text-destructive">
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
