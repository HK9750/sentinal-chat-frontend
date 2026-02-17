'use client';

import { useState, useCallback } from 'react';
import { Plus, Search, Users, MoreVertical, Trash2, Edit2 } from 'lucide-react';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useBroadcasts, useCreateBroadcast, useDeleteBroadcast } from '@/queries/use-broadcast-queries';
import { useAuthStore } from '@/stores/auth-store';
import type { Broadcast } from '@/types/broadcast';
import { cn } from '@/lib/utils';
import { BroadcastDetail } from './broadcast-detail';

export function BroadcastList() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBroadcast, setSelectedBroadcast] = useState<Broadcast | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newBroadcastName, setNewBroadcastName] = useState('');
  const [newBroadcastDescription, setNewBroadcastDescription] = useState('');

  const user = useAuthStore((state) => state.user);
  const { data: broadcasts, isLoading } = useBroadcasts(user?.id || '');
  const createBroadcast = useCreateBroadcast();
  const deleteBroadcast = useDeleteBroadcast();

  const filteredBroadcasts = broadcasts?.filter((b) =>
    b.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateBroadcast = useCallback(async () => {
    if (!newBroadcastName.trim() || !user) return;

    try {
      await createBroadcast.mutateAsync({
        name: newBroadcastName.trim(),
        description: newBroadcastDescription.trim() || undefined,
      });
      setCreateDialogOpen(false);
      setNewBroadcastName('');
      setNewBroadcastDescription('');
    } catch (error) {
      console.error('Failed to create broadcast:', error);
    }
  }, [newBroadcastName, newBroadcastDescription, user, createBroadcast]);

  const handleDeleteBroadcast = useCallback(async (broadcastId: string) => {
    try {
      await deleteBroadcast.mutateAsync(broadcastId);
      if (selectedBroadcast?.id === broadcastId) {
        setSelectedBroadcast(null);
      }
    } catch (error) {
      console.error('Failed to delete broadcast:', error);
    }
  }, [deleteBroadcast, selectedBroadcast]);

  if (selectedBroadcast) {
    return (
      <BroadcastDetail
        broadcast={selectedBroadcast}
        onBack={() => setSelectedBroadcast(null)}
      />
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-800">
        <h1 className="text-xl font-semibold text-slate-100">Broadcast Lists</h1>
        <Button
          onClick={() => setCreateDialogOpen(true)}
          className="bg-blue-600 hover:bg-blue-500"
        >
          <Plus className="h-4 w-4 mr-2" />
          New List
        </Button>
      </div>

      {/* Search */}
      <div className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search broadcast lists..."
            className="pl-10 bg-slate-800/50 border-slate-700 text-slate-200"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-600 border-t-blue-500" />
          </div>
        ) : filteredBroadcasts?.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-500">
            <Users className="h-12 w-12 mb-4 opacity-50" />
            <p>No broadcast lists found</p>
            <p className="text-sm mt-1">Create one to get started</p>
          </div>
        ) : (
          filteredBroadcasts?.map((broadcast) => (
            <Card
              key={broadcast.id}
              className={cn(
                'p-4 bg-slate-800/50 border-slate-700 hover:bg-slate-800/70',
                'cursor-pointer transition-colors'
              )}
              onClick={() => setSelectedBroadcast(broadcast)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
                    <Users className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-medium text-slate-200">{broadcast.name}</h3>
                    <p className="text-sm text-slate-500">
                      {broadcast.recipient_count} recipient{broadcast.recipient_count !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={(e) => {
                      e.stopPropagation();
                      setSelectedBroadcast(broadcast);
                    }}>
                      <Edit2 className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-red-500"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteBroadcast(broadcast.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {broadcast.description && (
                <p className="mt-2 text-sm text-slate-400 line-clamp-2">
                  {broadcast.description}
                </p>
              )}
            </Card>
          ))
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-slate-100">Create Broadcast List</DialogTitle>
            <DialogDescription className="text-slate-400">
              Create a new list to send messages to multiple contacts at once.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-slate-300 mb-2 block">
                List Name
              </label>
              <Input
                value={newBroadcastName}
                onChange={(e) => setNewBroadcastName(e.target.value)}
                placeholder="e.g., Team Updates"
                className="bg-slate-800/50 border-slate-700 text-slate-200"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-300 mb-2 block">
                Description (optional)
              </label>
              <Input
                value={newBroadcastDescription}
                onChange={(e) => setNewBroadcastDescription(e.target.value)}
                placeholder="What is this list for?"
                className="bg-slate-800/50 border-slate-700 text-slate-200"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateDialogOpen(false)}
              className="border-slate-600 text-slate-300"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateBroadcast}
              disabled={!newBroadcastName.trim() || createBroadcast.isPending}
              className="bg-blue-600 hover:bg-blue-500"
            >
              Create List
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
