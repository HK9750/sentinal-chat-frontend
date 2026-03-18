'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface MessageSkeletonProps {
  isOwn?: boolean;
}

function MessageSkeleton({ isOwn = false }: MessageSkeletonProps) {
  return (
    <div className={cn('flex gap-2.5', isOwn ? 'justify-end' : 'justify-start')}>
      {!isOwn && <Skeleton className="size-8 shrink-0 rounded-full" />}
      <div
        className={cn(
          'max-w-[65%] space-y-2 rounded-[24px] border px-4 py-3',
          isOwn ? 'border-primary/20 bg-primary/5' : 'border-border bg-card'
        )}
      >
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-4 w-32" />
        <div className="flex justify-end">
          <Skeleton className="h-3 w-12" />
        </div>
      </div>
    </div>
  );
}

export function MessageListSkeleton() {
  return (
    <div className="flex-1 overflow-hidden px-3 py-5 lg:px-6 lg:py-6">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-5">
        {/* Date separator skeleton */}
        <div className="flex justify-center">
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>

        {/* Message skeletons */}
        <div className="space-y-3">
          <MessageSkeleton />
          <MessageSkeleton isOwn />
          <MessageSkeleton />
          <MessageSkeleton />
          <MessageSkeleton isOwn />
          <MessageSkeleton isOwn />
          <MessageSkeleton />
        </div>
      </div>
    </div>
  );
}
