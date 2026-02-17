'use client';

import { useState, useCallback } from 'react';
import { ArrowLeft, Plus, Trash2, Users, Search, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { UserAvatar } from '@/components/shared/user-avatar';
import {
  useBroadcastRecipients,
  useAddBroadcastRecipient,
  useRemoveBroadcastRecipient,
  useUpdateBroadcast,
} from '@/queries/use-broadcast-queries';
import type { Broadcast } from '@/types/broadcast';
import { cn } from '@/lib/utils';

interface BroadcastDetailProps {
  broadcast: Broadcast;
  onBack: () => void;
}

export function BroadcastDetail({ broadcast, onBack }: BroadcastDetailProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [addRecipientDialogOpen, setAddRecipientDialogOpen] = useState(false);
  const [newRecipientId, setNewRecipientId] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(broadcast.name);
  const [editDescription, setEditDescription] = useState(broadcast.description || '');

  const { data: recipients, isLoading } = useBroadcastRecipients(broadcast.id);
  const addRecipient = useAddBroadcastRecipient();
  const removeRecipient = useRemoveBroadcastRecipient();
  const updateBroadcast = useUpdateBroadcast();

  const filteredRecipients = recipients?.filter((r) =>
    r.username?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddRecipient = useCallback(async () => {
    if (!newRecipientId.trim()) return;

    try {
      await addRecipient.mutateAsync({
        broadcastId: broadcast.id,
        userId: newRecipientId.trim(),
      });
      setAddRecipientDialogOpen(false);
      setNewRecipientId('');
    } catch (error) {
      console.error('Failed to add recipient:', error);
    }
  }, [newRecipientId, broadcast.id, addRecipient]);

  const handleRemoveRecipient = useCallback(async (userId: string) => {
    try {
      await removeRecipient.mutateAsync({
        broadcastId: broadcast.id,
        userId,
      });
    } catch (error) {
      console.error('Failed to remove recipient:', error);
    }
  }, [broadcast.id, removeRecipient]);

  const handleSaveEdit = useCallback(async () => {
    try {
      await updateBroadcast.mutateAsync({
        broadcastId: broadcast.id,
        data: {
          name: editName.trim(),
          description: editDescription.trim() || undefined,
        },
      });
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update broadcast:', error);
    }
  }, [broadcast.id, editName, editDescription, updateBroadcast]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-4 p-4 border-b border-slate-800">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="text-slate-400 hover:text-white"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>

        {isEditing ? (
          <div className="flex-1 flex items-center gap-2">
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="bg-slate-800/50 border-slate-700 text-slate-200"
            />
            <Button
              onClick={handleSaveEdit}
              disabled={updateBroadcast.isPending}
              className="bg-blue-600 hover:bg-blue-500"
            >
              Save
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditing(false);
                setEditName(broadcast.name);
                setEditDescription(broadcast.description || '');
              }}
              className="border-slate-600 text-slate-300"
            >
              Cancel
            </Button>
          </div>
        ) : (
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold text-slate-100">{broadcast.name}</h1>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(true)}
                className="text-slate-400 hover:text-white"
              >
                Edit
              </Button>
            </div>
            {broadcast.description && (
              <p className="text-sm text-slate-400">{broadcast.description}</p>
            )}
          </div>
        )}

        <Button
          onClick={() => setAddRecipientDialogOpen(true)}
          className="bg-blue-600 hover:bg-blue-500"
        >
          <UserPlus className="h-4 w-4 mr-2" />
          Add Recipient
        </Button>
      </div>

      {/* Search */}
      <div className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search recipients..."
            className="pl-10 bg-slate-800/50 border-slate-700 text-slate-200"
          />
        </div>
      </div>

      {/* Recipients List */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-600 border-t-blue-500" />
          </div>
        ) : filteredRecipients?.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-500">
            <Users className="h-12 w-12 mb-4 opacity-50" />
            <p>No recipients in this list</p>
            <p className="text-sm mt-1">Add contacts to send broadcasts to</p>
          </div>
        ) : (
          filteredRecipients?.map((recipient) => (
            <Card
              key={recipient.user_id}
              className={cn(
                'p-3 bg-slate-800/50 border-slate-700',
                'flex items-center justify-between'
              )}
            >
              <div className="flex items-center gap-3">
                <UserAvatar
                  user={{
                    id: recipient.user_id,
                    display_name: recipient.username || 'User',
                    avatar_url: recipient.avatar_url,
                  }}
                  size="sm"
                />
                <div>
                  <p className="font-medium text-slate-200">
                    {recipient.username || 'Unknown User'}
                  </p>
                  <p className="text-xs text-slate-500">
                    Added {new Date(recipient.added_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleRemoveRecipient(recipient.user_id)}
                disabled={removeRecipient.isPending}
                className="text-slate-400 hover:text-red-400"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </Card>
          ))
        )}
      </div>

      {/* Add Recipient Dialog */}
      <Dialog open={addRecipientDialogOpen} onOpenChange={setAddRecipientDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-slate-100">Add Recipient</DialogTitle>
            <DialogDescription className="text-slate-400">
              Add a contact to this broadcast list by entering their user ID.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <label className="text-sm font-medium text-slate-300 mb-2 block">
              User ID
            </label>
            <Input
              value={newRecipientId}
              onChange={(e) => setNewRecipientId(e.target.value)}
              placeholder="Enter user ID"
              className="bg-slate-800/50 border-slate-700 text-slate-200"
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAddRecipientDialogOpen(false)}
              className="border-slate-600 text-slate-300"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddRecipient}
              disabled={!newRecipientId.trim() || addRecipient.isPending}
              className="bg-blue-600 hover:bg-blue-500"
            >
              Add Recipient
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
