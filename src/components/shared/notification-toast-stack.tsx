'use client';

import Link from 'next/link';
import { X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useNotificationStore } from '@/stores/notification-store';
import type { NotificationItem } from '@/types';

interface ToastNotification extends NotificationItem {
  toast_id: string;
}

const MAX_TOASTS = 3;
const AUTO_DISMISS_MS = 6000;

function kindLabel(type: string) {
  if (type === 'CALL_MISSED') {
    return 'Missed call';
  }
  if (type === 'MESSAGE_NEW') {
    return 'New message';
  }
  return 'Notification';
}

export function NotificationToastStack() {
  const panelOpen = useNotificationStore((state) => state.panelOpen);
  const toastsEnabled = useNotificationStore((state) => state.toastsEnabled);
  const [queue, setQueue] = useState<ToastNotification[]>([]);

  useEffect(() => {
    const handler = (event: Event) => {
      if (!toastsEnabled || panelOpen) {
        return;
      }

      const custom = event as CustomEvent<{ notification?: NotificationItem }>;
      const notification = custom.detail?.notification;
      if (!notification) {
        return;
      }

      setQueue((current) => {
        const withoutDuplicate = current.filter((item) => item.id !== notification.id);
        const next: ToastNotification[] = [
          {
            ...notification,
            toast_id: `${notification.id}:${Date.now()}`,
          },
          ...withoutDuplicate,
        ];
        return next.slice(0, MAX_TOASTS);
      });
    };

    window.addEventListener('notification:toast', handler);
    return () => {
      window.removeEventListener('notification:toast', handler);
    };
  }, [panelOpen, toastsEnabled]);

  useEffect(() => {
    if (queue.length === 0) {
      return;
    }

    const timers = queue.map((item) =>
      window.setTimeout(() => {
        setQueue((current) => current.filter((candidate) => candidate.toast_id !== item.toast_id));
      }, AUTO_DISMISS_MS)
    );

    return () => {
      timers.forEach((timerId) => window.clearTimeout(timerId));
    };
  }, [queue]);

  const visibleToasts = useMemo(
    () => (panelOpen ? [] : queue.slice(0, MAX_TOASTS)),
    [panelOpen, queue]
  );

  if (visibleToasts.length === 0 || !toastsEnabled) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[120] flex w-[min(380px,calc(100vw-2rem))] flex-col gap-2">
      {visibleToasts.map((item) => (
        <div
          key={item.toast_id}
          className={cn(
            'pointer-events-auto rounded-xl border border-border bg-card/95 p-3 shadow-xl backdrop-blur supports-[backdrop-filter]:bg-card/85',
            item.is_read ? 'opacity-90' : 'opacity-100'
          )}
        >
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">{kindLabel(item.type)}</p>
              <p className="mt-1 truncate text-sm font-semibold text-foreground">{item.title}</p>
              <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{item.body}</p>
              <div className="mt-2">
                <Button asChild size="xs" variant="outline" className="h-7 rounded-full px-3 text-xs">
                  <Link href={item.deep_link || '/chat'}>Open</Link>
                </Button>
              </div>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              className="shrink-0 rounded-full"
              onClick={() => {
                setQueue((current) => current.filter((candidate) => candidate.toast_id !== item.toast_id));
              }}
              aria-label="Dismiss notification"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
