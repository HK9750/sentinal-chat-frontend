'use client';

import { BellRing, CheckCheck, ExternalLink } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from '@/queries/use-notification-queries';
import { formatRelativeTime } from '@/lib/utils';
import { useNotificationStore } from '@/stores/notification-store';
import type { NotificationItem } from '@/types';

function notificationLabel(item: NotificationItem): string {
  if (item.type === 'CALL_MISSED') {
    return 'Missed call';
  }
  if (item.type === 'MESSAGE_NEW') {
    return 'New message';
  }
  return 'Notification';
}

export function NotificationPanel() {
  const router = useRouter();
  const panelOpen = useNotificationStore((state) => state.panelOpen);
  const setPanelOpen = useNotificationStore((state) => state.setPanelOpen);
  const badgeUnreadCount = useNotificationStore((state) => state.unreadCount);
  const listQuery = useNotifications(false, panelOpen);
  const markReadMutation = useMarkNotificationRead();
  const markAllReadMutation = useMarkAllNotificationsRead();

  const items = useMemo(() => listQuery.data?.items ?? [], [listQuery.data?.items]);
  const unreadCount = badgeUnreadCount;

  return (
    <Dialog open={panelOpen} onOpenChange={setPanelOpen}>
      <DialogContent className="max-h-[85vh] sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BellRing className="h-5 w-5" />
            Notifications
          </DialogTitle>
          <DialogDescription>
            {unreadCount > 0
              ? `${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}`
              : 'You are all caught up.'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-end">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={markAllReadMutation.isPending || unreadCount === 0}
            onClick={() => {
              void markAllReadMutation.mutateAsync();
            }}
          >
            <CheckCheck className="h-4 w-4" />
            Mark all as read
          </Button>
        </div>

        <div className="rounded-xl border border-border bg-background">
          <ScrollArea className="max-h-[60vh]">
            {listQuery.isLoading ? (
              <div className="p-6 text-center text-sm text-muted-foreground">Loading notifications...</div>
            ) : listQuery.isError ? (
              <div className="p-6 text-center text-sm text-destructive">Unable to load notifications.</div>
            ) : items.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">No notifications yet.</div>
            ) : (
              <div className="divide-y divide-border">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className={`space-y-2 px-4 py-3 ${item.is_read ? 'bg-background' : 'bg-primary/5'}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex items-center gap-2">
                          <Badge variant={item.is_read ? 'secondary' : 'default'} className="text-[10px] uppercase">
                            {notificationLabel(item)}
                          </Badge>
                          {!item.is_read && <span className="h-2 w-2 rounded-full bg-primary" />}
                        </div>
                        <p className="truncate text-sm font-semibold text-foreground">{item.title}</p>
                        <p className="mt-0.5 text-sm text-muted-foreground">{item.body}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{formatRelativeTime(item.created_at)}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        size="xs"
                        variant="outline"
                        disabled={item.is_read || markReadMutation.isPending}
                        onClick={() => {
                          void markReadMutation.mutateAsync(item.id);
                        }}
                      >
                        Mark read
                      </Button>
                      <Button
                        type="button"
                        size="xs"
                        variant="ghost"
                        onClick={() => {
                          void (async () => {
                            if (!item.is_read) {
                              await markReadMutation.mutateAsync(item.id);
                            }
                            setPanelOpen(false);
                            router.push(item.deep_link || '/chat');
                          })();
                        }}
                      >
                        Open
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
