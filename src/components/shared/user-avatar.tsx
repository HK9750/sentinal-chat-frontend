'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface UserInfo {
  id: string;
  display_name: string;
  avatar_url?: string;
  username?: string;
}

interface UserAvatarProps {
  user?: UserInfo | null;
  src?: string;
  alt?: string;
  fallback?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showStatus?: boolean;
  isOnline?: boolean;
}

const sizeClasses = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-16 w-16 text-lg',
};

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function UserAvatar({
  user,
  src,
  alt,
  fallback,
  size = 'md',
  className,
  showStatus = false,
  isOnline = false,
}: UserAvatarProps) {
  const imageUrl = src || user?.avatar_url;
  const name = alt || user?.display_name || user?.username || 'User';
  const initials = fallback || getInitials(name);

  return (
    <div className={cn('relative inline-block', className)}>
      <Avatar className={cn(sizeClasses[size])}>
        <AvatarImage src={imageUrl} alt={name} />
        <AvatarFallback className="bg-gradient-to-br from-slate-600 to-slate-700 text-slate-200 font-medium">
          {initials}
        </AvatarFallback>
      </Avatar>
      {showStatus && (
        <span
          className={cn(
            'absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full ring-2 ring-slate-900',
            isOnline ? 'bg-emerald-500' : 'bg-slate-500'
          )}
        />
      )}
    </div>
  );
}
