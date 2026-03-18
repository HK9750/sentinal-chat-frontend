'use client';

import { cn } from '@/lib/utils';

interface TypingIndicatorProps {
  className?: string;
}

export function TypingIndicator({ className }: TypingIndicatorProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 rounded-full bg-muted px-3 py-2',
        className
      )}
    >
      <span className="size-2 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:-0.3s]" />
      <span className="size-2 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:-0.15s]" />
      <span className="size-2 animate-bounce rounded-full bg-muted-foreground/60" />
    </div>
  );
}

interface TypingBubbleProps {
  userNames?: string[];
  className?: string;
}

export function TypingBubble({ userNames, className }: TypingBubbleProps) {
  const displayText =
    !userNames || userNames.length === 0
      ? 'Someone is typing'
      : userNames.length === 1
        ? `${userNames[0]} is typing`
        : userNames.length === 2
          ? `${userNames[0]} and ${userNames[1]} are typing`
          : `${userNames[0]} and ${userNames.length - 1} others are typing`;

  return (
    <div className={cn('flex items-end gap-2.5', className)}>
      <div className="flex max-w-[82%] flex-col gap-1">
        <span className="px-1 text-[11px] font-medium text-muted-foreground">
          {displayText}
        </span>
        <div className="rounded-[24px] border border-border bg-card px-4 py-3 shadow-sm">
          <TypingIndicator />
        </div>
      </div>
    </div>
  );
}
