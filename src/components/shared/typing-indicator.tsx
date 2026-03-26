'use client';

import { cn } from '@/lib/utils';

interface TypingIndicatorProps {
  className?: string;
}

function TypingIndicator({ className }: TypingIndicatorProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 px-1 py-1',
        className
      )}
    >
      <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:-0.3s]" />
      <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:-0.15s]" />
      <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50" />
    </div>
  );
}

interface TypingBubbleProps {
  className?: string;
}

export function TypingBubble({ className }: TypingBubbleProps) {
  return (
    <div className={cn('flex justify-start px-1 py-0.5', className)}>
      <div className="mr-2 flex h-8 w-8 shrink-0 items-end">
        <span aria-hidden className="block h-8 w-8" />
      </div>

      <div className="relative max-w-[82%] md:max-w-[76%] lg:max-w-[66%]">
        {/* WhatsApp style typing bubble with tail */}
        <div className="relative rounded-lg rounded-tl-none bg-message-in px-3 py-2 shadow-sm">
          {/* Tail */}
          <div className="absolute -left-2 top-0 h-3 w-2">
            <svg
              viewBox="0 0 8 13"
              className="h-full w-full text-message-in"
              fill="currentColor"
            >
              <path d="M7 0L0 0L0 6C0 6 0 12 7 13C7 13 5 9 5 6L5 3C5 3 5 0 7 0Z" />
            </svg>
          </div>

          <TypingIndicator />
        </div>
      </div>
    </div>
  );
}
