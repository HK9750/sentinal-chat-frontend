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
        {/* Avatar - only show for others and first message in group */}
        {showAvatar && !isOwn && message.sender ? (
          <UserAvatar
            user={message.sender}
            size="sm"
            className="flex-shrink-0"
          />
        ) : !isOwn ? (
          <div className="w-8 flex-shrink-0" />
        ) : null}

        {/* Message Content */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={cn(
                'px-4 py-2.5 rounded-2xl relative group',
                isOwn
                  ? 'bg-blue-600 text-white rounded-br-md'
                  : 'bg-slate-800 text-slate-200 rounded-bl-md'
              )}
            >
              {/* Sender name for group chats */}
              {!isOwn && message.sender && showAvatar && (
                <p className="text-xs font-medium text-blue-400 mb-1">
                  {message.sender.display_name}
                </p>
              )}

              {/* Message text */}
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {message.content || message.ciphertext || '[Encrypted]'}
              </p>

              {/* Footer with time and status */}
              <div
                className={cn(
                  'flex items-center gap-1 mt-1',
                  isOwn ? 'justify-end' : ''
                )}
              >
                <span
                  className={cn(
                    'text-[10px]',
                    isOwn ? 'text-blue-200/70' : 'text-slate-500'
                  )}
                >
                  {formatTime(message.created_at)}
                </span>

                {/* Status indicator for own messages */}
                {isOwn && (
                  <StatusIcon
                    className={cn(
                      'h-3 w-3',
                      status === 'read'
                        ? 'text-blue-300'
                        : 'text-blue-200/70',
                      status === 'sending' && 'animate-pulse'
                    )}
                  />
                )}
              </div>

              {/* Edited indicator */}
              {message.is_edited && (
                <span
                  className={cn(
                    'text-[10px] ml-1',
                    isOwn ? 'text-blue-200/50' : 'text-slate-600'
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
              <p className="text-xs text-slate-400">
                Edited: {new Date(message.edited_at).toLocaleString()}
              </p>
            )}
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}

// Group messages by sender for better UI
export function groupMessages(messages: Message[]): {
  message: Message;
  isOwn: boolean;
  showAvatar: boolean;
  isFirstInGroup: boolean;
  isLastInGroup: boolean;
}[] {
  return messages.map((message, index) => {
    const prevMessage = messages[index - 1];
    const nextMessage = messages[index + 1];

    const isOwn = message.sender_id === message.sender?.id;
    const isFirstInGroup =
      !prevMessage || prevMessage.sender_id !== message.sender_id;
    const isLastInGroup =
      !nextMessage || nextMessage.sender_id !== message.sender_id;

    return {
      message,
      isOwn,
      showAvatar: isFirstInGroup && !isOwn,
      isFirstInGroup,
      isLastInGroup,
    };
  });
}
