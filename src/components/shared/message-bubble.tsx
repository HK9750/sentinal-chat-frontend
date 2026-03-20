'use client';

import { Check, CheckCheck, Download, FileAudio, FileText } from 'lucide-react';
import { useMemo, useState } from 'react';
import { AudioPlayer } from '@/components/shared/audio-player';
import { MessageActions } from '@/components/shared/message-actions';
import { MessageReactions } from '@/components/shared/message-reactions';
import { Button } from '@/components/ui/button';
import { cn, formatBytes, formatTimestamp, isImageMimeType } from '@/lib/utils';
import { getMessagePrimaryText } from '@/lib/message-payload';
import { markAttachmentViewed } from '@/services/upload-service';
import type { Message } from '@/types';

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  showAvatar?: boolean;
  showTail?: boolean;
  authorLabel?: string;
  avatarUrl?: string | null;
  currentUserId?: string;
  onPlayed?: (messageId: string) => void;
  onReply?: (message: Message) => void;
  onEdit?: (message: Message) => void;
  onDelete?: (message: Message) => void;
  onReact?: (messageId: string, emoji: string, mode: 'add' | 'remove') => void;
}

export function MessageBubble({
  message,
  isOwn,
  showTail = false,
  authorLabel,
  currentUserId,
  onPlayed,
  onReply,
  onEdit,
  onDelete,
  onReact,
}: MessageBubbleProps) {
  const [isHovered, setIsHovered] = useState(false);

  const markViewed = (attachmentId: string, viewOnce: boolean) => {
    if (!viewOnce) {
      return;
    }

    void markAttachmentViewed(attachmentId).catch(() => {
      return;
    });
  };

  const deliveryState = useMemo(() => {
    if (message.client_status === 'PENDING') {
      return 'PENDING' as const;
    }

    if (message.client_status === 'FAILED') {
      return 'FAILED' as const;
    }

    const others = (message.receipts ?? []).filter(
      (receipt) => receipt.user_id !== message.sender_id
    );

    return others.reduce<'SENT' | 'DELIVERED' | 'READ' | 'PLAYED'>((state, receipt) => {
      if (receipt.status === 'PLAYED') {
        return 'PLAYED';
      }
      if (receipt.status === 'READ' && state !== 'PLAYED') {
        return 'READ';
      }
      if (receipt.status === 'DELIVERED' && state === 'SENT') {
        return 'DELIVERED';
      }
      return state;
    }, 'SENT');
  }, [message.client_status, message.receipts, message.sender_id]);

  const receiptIcon = useMemo(() => {
    if (!isOwn) {
      return null;
    }

    if (deliveryState === 'PENDING') {
      return <span className="text-[11px] text-muted-foreground">...</span>;
    }

    if (deliveryState === 'FAILED') {
      return <span className="text-[11px] text-destructive">!</span>;
    }

    if (deliveryState === 'SENT') {
      return <Check className="h-[14px] w-[14px]" />;
    }

    return (
      <CheckCheck
        className={cn(
          'h-[14px] w-[14px]',
          deliveryState === 'READ' || deliveryState === 'PLAYED'
            ? 'text-[#53bdeb]'
            : 'text-muted-foreground'
        )}
      />
    );
  }, [deliveryState, isOwn]);

  const shouldRenderAssetCards = message.attachments.length > 0;
  const hasReactions = (message.reactions?.length ?? 0) > 0;
  const isDeleted = !!message.deleted_at;
  const messageText = getMessagePrimaryText(message);

  const handleCopy = (msg: Message) => {
    const text = getMessagePrimaryText(msg);
    if (text) {
      void navigator.clipboard.writeText(text);
    }
  };

  const handleToggleReaction = (emoji: string) => {
    if (!onReact) return;

    const hasOwnReaction = message.reactions?.some(
      (r) => r.reaction_code === emoji && r.user_id === currentUserId
    );

    onReact(message.id, emoji, hasOwnReaction ? 'remove' : 'add');
  };

  // Show deleted message placeholder
  if (isDeleted) {
    return (
      <div className={cn('flex px-1 py-0.5', isOwn ? 'justify-end' : 'justify-start')}>
        <div
          className={cn(
            'rounded-lg border border-dashed px-3 py-2',
            isOwn
              ? 'border-primary/20 bg-message-out/50'
              : 'border-border bg-message-in/50'
          )}
        >
          <p className="text-sm italic text-muted-foreground">This message was deleted</p>
          <div className="mt-1 flex items-center justify-end gap-1 text-[11px] text-muted-foreground">
            <span>{formatTimestamp(message.created_at)}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn('group relative flex px-1 py-0.5', isOwn ? 'justify-end' : 'justify-start')}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative max-w-[65%] lg:max-w-[45%]">
        {/* Message actions - appear on hover */}
        {isHovered && onReply && onEdit && onDelete && onReact && (
          <MessageActions
            message={message}
            isOwn={isOwn}
            onReply={onReply}
            onEdit={onEdit}
            onDelete={onDelete}
            onReact={(msg, emoji) => onReact(msg.id, emoji, 'add')}
            onCopy={handleCopy}
            className={cn(
              'absolute top-1 z-10',
              isOwn ? 'right-full mr-1' : 'left-full ml-1'
            )}
          />
        )}

        {/* Message bubble - WhatsApp style */}
        <div
          className={cn(
            'relative rounded-lg px-2.5 py-1.5 shadow-sm',
            isOwn ? 'bg-message-out' : 'bg-message-in',
            // Tail styling
            showTail && isOwn && 'rounded-tr-none',
            showTail && !isOwn && 'rounded-tl-none'
          )}
        >
          {/* Tail SVG */}
          {showTail && (
            <div
              className={cn(
                'absolute top-0 h-3 w-2',
                isOwn ? '-right-2' : '-left-2'
              )}
            >
              <svg
                viewBox="0 0 8 13"
                className={cn('h-full w-full', isOwn ? 'text-message-out' : 'text-message-in')}
                fill="currentColor"
              >
                {isOwn ? (
                  <path d="M1 0L8 0L8 6C8 6 8 12 1 13C1 13 3 9 3 6L3 3C3 3 3 0 1 0Z" />
                ) : (
                  <path d="M7 0L0 0L0 6C0 6 0 12 7 13C7 13 5 9 5 6L5 3C5 3 5 0 7 0Z" />
                )}
              </svg>
            </div>
          )}

          {/* Author label for group chats */}
          {!isOwn && showTail && authorLabel && (
            <p className="mb-0.5 text-xs font-medium text-primary">{authorLabel}</p>
          )}

          {/* Message content */}
          <div className="space-y-1.5">
            {messageText && (
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                {messageText}
              </p>
            )}

            {/* Attachments */}
            {shouldRenderAssetCards && (
              <div className="space-y-1.5">
                {message.attachments.map((attachment) => {
                  const isAudio = message.type === 'AUDIO';
                  const isImage = isImageMimeType(attachment.mime_type);
                  const assetUrl = attachment.file_url;
                  const fileName = attachment.filename ?? 'attachment';

                  return (
                    <div
                      key={attachment.id}
                      className="overflow-hidden rounded-lg border border-border/50"
                    >
                      {isImage && (
                        <a
                          href={assetUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block"
                          onClick={() => markViewed(attachment.id, attachment.view_once)}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={assetUrl}
                            alt={fileName}
                            className="max-h-72 w-full rounded-lg object-cover"
                          />
                        </a>
                      )}

                      {!isImage && (
                        <div className="flex items-center gap-2 bg-card/50 p-2">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                            {isAudio ? (
                              <FileAudio className="h-5 w-5 text-primary" />
                            ) : (
                              <FileText className="h-5 w-5 text-primary" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{fileName}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatBytes(attachment.size_bytes)}
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0 rounded-full"
                            asChild
                          >
                            <a
                              href={assetUrl}
                              download={fileName}
                              onClick={() =>
                                markViewed(attachment.id, attachment.view_once)
                              }
                            >
                              <Download className="h-4 w-4" />
                            </a>
                          </Button>
                        </div>
                      )}

                      {isAudio && (
                        <div className="p-2">
                          <AudioPlayer
                            src={assetUrl}
                            onPlay={() => {
                              markViewed(attachment.id, attachment.view_once);
                              onPlayed?.(message.id);
                            }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Timestamp and receipt */}
          <div className="mt-0.5 flex items-center justify-end gap-1">
            {message.edited_at && (
              <span className="text-[11px] text-muted-foreground">edited</span>
            )}
            <span className="text-[11px] text-muted-foreground">
              {formatTimestamp(message.created_at)}
            </span>
            {receiptIcon}
          </div>
        </div>

        {/* Reactions display */}
        {hasReactions && (
          <MessageReactions
            reactions={message.reactions ?? []}
            currentUserId={currentUserId}
            onToggleReaction={handleToggleReaction}
            isOwn={isOwn}
          />
        )}
      </div>
    </div>
  );
}
