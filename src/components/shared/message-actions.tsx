'use client';

import { useState } from 'react';
import {
  Copy,
  CornerUpLeft,
  MoreVertical,
  Pencil,
  SmilePlus,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { Message } from '@/types';

// Common emoji reactions (WhatsApp style)
const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

interface MessageActionsProps {
  message: Message;
  isOwn: boolean;
  onReply: (message: Message) => void;
  onEdit: (message: Message) => void;
  onDelete: (message: Message) => void;
  onReact: (message: Message, emoji: string) => void;
  onCopy: (message: Message) => void;
  className?: string;
}

export function MessageActions({
  message,
  isOwn,
  onReply,
  onEdit,
  onDelete,
  onReact,
  onCopy,
  className,
}: MessageActionsProps) {
  const [showReactions, setShowReactions] = useState(false);

  const canEdit = isOwn && message.type === 'TEXT' && !message.deleted_at;
  const canDelete = isOwn && !message.deleted_at;

  return (
    <div
      className={cn(
        'flex items-center gap-0.5 rounded-xl border border-border bg-card/95 p-0.5 shadow-md backdrop-blur-sm',
        className
      )}
    >
      {/* Emoji reaction button */}
      <div className="relative">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8 rounded-lg hover:bg-muted"
              onClick={() => setShowReactions(!showReactions)}
            >
              <SmilePlus className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">React</TooltipContent>
        </Tooltip>

        {/* Quick reaction picker */}
        {showReactions && (
          <div
            className={cn(
              'absolute bottom-full mb-1 flex items-center gap-0.5 rounded-full border border-border bg-card p-1 shadow-lg',
              isOwn ? 'right-0' : 'left-0'
            )}
          >
            {QUICK_REACTIONS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                className="flex size-8 items-center justify-center rounded-full text-lg transition-transform hover:scale-125 hover:bg-muted"
                onClick={() => {
                  onReact(message, emoji);
                  setShowReactions(false);
                }}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Reply button */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 rounded-lg hover:bg-muted"
            onClick={() => onReply(message)}
          >
            <CornerUpLeft className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">Reply</TooltipContent>
      </Tooltip>

      {/* More actions dropdown */}
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8 rounded-lg hover:bg-muted"
              >
                <MoreVertical className="size-4" />
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="top">More</TooltipContent>
        </Tooltip>

        <DropdownMenuContent
          align={isOwn ? 'end' : 'start'}
          className="min-w-[160px] rounded-xl"
        >
          <DropdownMenuItem onClick={() => onCopy(message)}>
            <Copy className="size-4" />
            Copy
          </DropdownMenuItem>

          {canEdit && (
            <DropdownMenuItem onClick={() => onEdit(message)}>
              <Pencil className="size-4" />
              Edit
            </DropdownMenuItem>
          )}

          {canDelete && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={() => onDelete(message)}
              >
                <Trash2 className="size-4" />
                Delete
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
