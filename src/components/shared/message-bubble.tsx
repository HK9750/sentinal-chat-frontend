'use client';

import { UserAvatar } from '@/components/shared/user-avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn, formatTime } from '@/lib/utils';
import { Message } from '@/types';
import { Check, CheckCheck, Clock } from 'lucide-react';

type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read';

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  showAvatar: boolean;
  status?: MessageStatus;
}

export function MessageBubble({
  message,
  isOwn,
  showAvatar,
  status = 'sent',
}: MessageBubbleProps) {
  const StatusIcon = {
    sending: Clock,
    sent: Check,
    delivered: CheckCheck,
    read: CheckCheck,
  }[status];

  return (
    <div className={cn('flex', isOwn ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'flex items-end gap-2 max-w-[75%]',
          isOwn ? 'flex-row-reverse' : ''
        )}
      >
        {showAvatar && !isOwn && message.sender ? (
          <UserAvatar
            user={message.sender}
            size="sm"
            className="shrink-0"
          />
        ) : !isOwn ? (
          <div className="w-8 shrink-0" />
        ) : null}

        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={cn(
                'px-4 py-2.5 rounded-2xl relative group',
                isOwn
                  ? 'bg-primary text-primary-foreground rounded-br-md'
                  : 'bg-muted text-foreground rounded-bl-md'
              )}
            >
              {!isOwn && message.sender && showAvatar && (
                <p className="text-xs font-medium text-primary mb-1">
                  {message.sender.display_name}
                </p>
              )}

              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {message.content || (message.ciphertext ? '🔒 Encrypted message' : '[No content]')}
              </p>

              <div
                className={cn(
                  'flex items-center gap-1 mt-1',
                  isOwn ? 'justify-end' : ''
                )}
              >
                <span
                  className={cn(
                    'text-[10px]',
                    isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'
                  )}
                >
                  {formatTime(message.created_at)}
                </span>

                {isOwn && (
                  <StatusIcon
                    className={cn(
                      'h-3 w-3',
                      status === 'read'
                        ? 'text-primary-foreground'
                        : 'text-primary-foreground/70',
                      status === 'sending' && 'animate-pulse'
                    )}
                  />
                )}
              </div>

              {message.is_edited && (
                <span
                  className={cn(
                    'text-[10px] ml-1',
                    isOwn ? 'text-primary-foreground/50' : 'text-muted-foreground'
                  )}
                >
                  edited
                </span>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent side={isOwn ? 'left' : 'right'}>
            <p className="text-xs">
              {new Date(message.created_at).toLocaleString()}
            </p>
            {message.is_edited && message.edited_at && (
              <p className="text-xs text-muted-foreground/80">
                Edited: {new Date(message.edited_at).toLocaleString()}
              </p>
            )}
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
