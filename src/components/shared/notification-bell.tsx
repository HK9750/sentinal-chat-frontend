'use client';

import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useNotificationStore } from '@/stores/notification-store';

interface NotificationBellProps {
  buttonClassName?: string;
}

export function NotificationBell({ buttonClassName }: NotificationBellProps) {
  const unreadCount = useNotificationStore((state) => state.unreadCount);
  const setPanelOpen = useNotificationStore((state) => state.setPanelOpen);

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn('h-10 w-10 rounded-full text-muted-foreground hover:bg-muted', buttonClassName)}
      aria-label="Open notifications"
      onClick={() => setPanelOpen(true)}
    >
      <span className="relative inline-flex">
        <Bell className="h-5 w-5" />
        {unreadCount > 0 ? (
          <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#00a884] px-1 text-[10px] font-semibold leading-none text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        ) : null}
      </span>
    </Button>
  );
}
