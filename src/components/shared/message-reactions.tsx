'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { MessageReaction } from '@/types';

interface MessageReactionsProps {
  reactions: MessageReaction[];
  currentUserId?: string;
  onToggleReaction: (emoji: string) => void;
  isOwn: boolean;
}

interface GroupedReaction {
  emoji: string;
  count: number;
  hasOwn: boolean;
  users: string[];
}

export function MessageReactions({
  reactions,
  currentUserId,
  onToggleReaction,
  isOwn,
}: MessageReactionsProps) {
  const grouped = useMemo(() => {
    const map = new Map<string, GroupedReaction>();

    for (const reaction of reactions) {
      const existing = map.get(reaction.reaction_code);
      if (existing) {
        existing.count += 1;
        existing.users.push(reaction.user_id);
        if (reaction.user_id === currentUserId) {
          existing.hasOwn = true;
        }
      } else {
        map.set(reaction.reaction_code, {
          emoji: reaction.reaction_code,
          count: 1,
          hasOwn: reaction.user_id === currentUserId,
          users: [reaction.user_id],
        });
      }
    }

    return Array.from(map.values());
  }, [reactions, currentUserId]);

  if (grouped.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        'mt-1 flex flex-wrap gap-1',
        isOwn ? 'justify-end' : 'justify-start'
      )}
    >
      {grouped.map((group) => (
        <button
          key={group.emoji}
          type="button"
          onClick={() => onToggleReaction(group.emoji)}
          className={cn(
            'flex items-center gap-1 rounded-full border px-2 py-0.5 text-sm transition-colors',
            group.hasOwn
              ? 'border-primary/30 bg-primary/10 hover:bg-primary/20'
              : 'border-border bg-card hover:bg-muted'
          )}
        >
          <span className="text-sm">{group.emoji}</span>
          {group.count > 1 && (
            <span className="text-xs font-medium text-muted-foreground">
              {group.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
