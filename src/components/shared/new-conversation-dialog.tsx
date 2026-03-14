'use client';

import { useCallback, useState } from 'react';
import { AlertTriangle, CopyPlus, Shield, Users } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateConversation } from '@/queries/use-conversation-queries';
import { APP_LIMITATIONS } from '@/lib/constants';

interface NewConversationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewConversationDialog({ open, onOpenChange }: NewConversationDialogProps) {
  const createConversation = useCreateConversation();
  const [participantId, setParticipantId] = useState('');
  const [groupName, setGroupName] = useState('');
  const [groupParticipants, setGroupParticipants] = useState('');
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setParticipantId('');
    setGroupName('');
    setGroupParticipants('');
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

  const handleCreateDm = useCallback(async () => {
    const trimmedId = participantId.trim();

    if (!trimmedId) {
      setError('Enter the participant UUID from the backend to start a DM.');
      return;
    }

    try {
      const conversation = await createConversation.mutateAsync({
        type: 'DM',
        participant_ids: [trimmedId],
      });
      reset();
      onOpenChange(false);
      window.location.href = `/chat?conversation=${conversation.id}`;
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Unable to create the conversation.');
    }
  }, [createConversation, onOpenChange, participantId, reset]);

  const handleCreateGroup = useCallback(async () => {
    const participantIds = groupParticipants
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);

    if (!groupName.trim()) {
      setError('Enter a group name first.');
      return;
    }

    if (participantIds.length === 0) {
      setError('Provide at least one participant UUID for the group.');
      return;
    }

    try {
      const conversation = await createConversation.mutateAsync({
        type: 'GROUP',
        subject: groupName.trim(),
        participant_ids: participantIds,
      });
      reset();
      onOpenChange(false);
      window.location.href = `/chat?conversation=${conversation.id}`;
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Unable to create the group.');
    }
  }, [createConversation, groupName, groupParticipants, onOpenChange, reset]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="surface-panel max-w-2xl border-border/70">
        <DialogHeader>
          <DialogTitle className="text-xl tracking-[-0.04em]">Create a conversation</DialogTitle>
          <DialogDescription>
            The current backend does not expose user search yet, so new conversations are created from known participant UUIDs.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-[22px] border border-border/70 bg-background/55 p-4">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <CopyPlus className="size-4" />
              </div>
              <div>
                <p className="text-sm font-semibold">Direct message</p>
                <p className="text-xs text-muted-foreground">One participant UUID</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="participant-id">Participant UUID</Label>
                <Input
                  id="participant-id"
                  value={participantId}
                  onChange={(event) => setParticipantId(event.target.value)}
                  placeholder="8f1c..."
                />
              </div>
              <Button className="w-full" onClick={handleCreateDm} disabled={createConversation.isPending}>
                Create DM
              </Button>
            </div>
          </div>

          <div className="rounded-[22px] border border-border/70 bg-background/55 p-4">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent/20 text-accent-foreground">
                <Users className="size-4" />
              </div>
              <div>
                <p className="text-sm font-semibold">Group chat</p>
                <p className="text-xs text-muted-foreground">Comma-separated participant UUIDs</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="group-name">Group name</Label>
                <Input
                  id="group-name"
                  value={groupName}
                  onChange={(event) => setGroupName(event.target.value)}
                  placeholder="Security review"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="group-participants">Participant UUIDs</Label>
                <Input
                  id="group-participants"
                  value={groupParticipants}
                  onChange={(event) => setGroupParticipants(event.target.value)}
                  placeholder="uuid-1, uuid-2"
                />
              </div>
              <Button className="w-full" onClick={handleCreateGroup} disabled={createConversation.isPending}>
                Create group
              </Button>
            </div>
          </div>
        </div>

        <div className="rounded-[22px] border border-border/70 bg-background/55 p-4 text-sm text-muted-foreground">
          <div className="flex items-start gap-3">
            <Shield className="mt-0.5 size-4 text-primary" />
            <p>{APP_LIMITATIONS.userSearch}</p>
          </div>
        </div>

        {error ? (
          <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 size-4" />
              {error}
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
