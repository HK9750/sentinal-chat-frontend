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
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-16 w-16 text-lg',
} as const;

const statusSizeMap = {
  sm: 'h-2.5 w-2.5 border-[1.5px]',
  md: 'h-3 w-3 border-2',
  lg: 'h-3.5 w-3.5 border-2',
  xl: 'h-4 w-4 border-2',
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
      <Avatar className={cn(sizeClassMap[size], 'bg-muted')}>
        <AvatarImage src={imageSrc ?? undefined} alt={label} className="object-cover" />
        <AvatarFallback className="bg-muted font-medium text-muted-foreground  ">
          {initials}
        </AvatarFallback>
      </Avatar>
      {showStatus && (
        <span
          className={cn(
            'absolute bottom-0 right-0 rounded-full border-sidebar',
            statusSizeMap[size],
            isOnline ? 'bg-primary' : 'bg-muted-foreground'
          )}
        />
      )}
    </div>
  );
}
