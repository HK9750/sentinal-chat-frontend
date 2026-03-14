'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface UserAvatarProps {
  src?: string | null;
  alt?: string;
  fallback?: string;
  user?: {
    display_name?: string | null;
    username?: string | null;
    avatar_url?: string | null;
  } | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showStatus?: boolean;
  isOnline?: boolean;
}

const sizeClassMap = {
  sm: 'size-8 text-xs',
  md: 'size-10 text-sm',
  lg: 'size-12 text-base',
  xl: 'size-16 text-lg',
} as const;

export function UserAvatar({
  src,
  alt,
  fallback,
  user,
  size = 'md',
  className,
  showStatus = false,
  isOnline = false,
}: UserAvatarProps) {
  const label = alt ?? user?.display_name ?? user?.username ?? 'User';
  const imageSrc = src ?? user?.avatar_url ?? undefined;
  const initials = fallback ?? getInitials(label);

  return (
    <div className={cn('relative inline-flex shrink-0', className)}>
      <Avatar className={cn(sizeClassMap[size], 'border border-white/20 bg-secondary/60')}>
        <AvatarImage src={imageSrc ?? undefined} alt={label} />
        <AvatarFallback className="bg-primary/15 font-semibold text-primary">{initials}</AvatarFallback>
      </Avatar>
      {showStatus ? (
        <span
          className={cn(
            'absolute bottom-0 right-0 size-3 rounded-full border-2 border-background',
            isOnline ? 'bg-emerald-500' : 'bg-muted-foreground'
          )}
        />
      ) : null}
    </div>
  );
}
