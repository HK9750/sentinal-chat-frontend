'use client';

import { Check, CheckCheck, Download, FileAudio, FileImage, FileText } from 'lucide-react';
import { useMemo, useState } from 'react';
import { AudioPlayer } from '@/components/shared/audio-player';
import { MessageActions } from '@/components/shared/message-actions';
import { MessageReactions } from '@/components/shared/message-reactions';
import { UserAvatar } from '@/components/shared/user-avatar';
import { Button } from '@/components/ui/button';
import { cn, formatBytes, formatTimestamp, isImageMimeType } from '@/lib/utils';
import { getMessagePrimaryText } from '@/lib/message-payload';
import { markAttachmentViewed } from '@/services/upload-service';
import type { Message } from '@/types';

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  showAvatar: boolean;
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
  showAvatar,
  authorLabel,
  avatarUrl,
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
    const others = (message.receipts ?? []).filter((receipt) => receipt.user_id !== message.sender_id);

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
  }, [message.receipts, message.sender_id]);

  const receiptIcon = useMemo(() => {
    if (!isOwn) {
      return null;
    }

    if (deliveryState === 'SENT') {
      return <Check className="size-3.5" />;
    }

    return (
      <CheckCheck
        className={cn('size-3.5', deliveryState === 'READ' || deliveryState === 'PLAYED' ? 'text-sky-500' : 'text-muted-foreground')}
      />
    );
  }, [deliveryState, isOwn]);

  const shouldRenderAssetCards = message.attachments.length > 0;
  const hasReactions = (message.reactions?.length ?? 0) > 0;
  const isDeleted = !!message.deleted_at;

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
      <div className={cn('flex gap-2.5', isOwn ? 'justify-end' : 'justify-start')}>
        {!isOwn ? (
          showAvatar ? <UserAvatar src={avatarUrl} alt={authorLabel} fallback={authorLabel?.[0] ?? 'U'} size="sm" /> : <div className="size-8 shrink-0" />
        ) : null}

        <div className="max-w-[82%] rounded-[24px] border border-dashed border-border bg-muted/30 px-4 py-3">
          <p className="text-sm italic text-muted-foreground">This message was deleted</p>
          <div className="mt-2 flex items-center justify-end gap-2 text-[11px] font-medium text-muted-foreground">
            <span>{formatTimestamp(message.created_at)}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn('group relative flex gap-2.5', isOwn ? 'justify-end' : 'justify-start')}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {!isOwn ? (
        showAvatar ? <UserAvatar src={avatarUrl} alt={authorLabel} fallback={authorLabel?.[0] ?? 'U'} size="sm" /> : <div className="size-8 shrink-0" />
      ) : null}

      <div className="relative max-w-[82%]">
        {/* Message actions - appear on hover (WhatsApp style) */}
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
              'absolute -top-3 z-10',
              isOwn ? 'right-0' : 'left-0'
            )}
          />
        )}

        <div
          className={cn(
            'rounded-[24px] border px-4 py-3 shadow-sm transition-shadow',
            isOwn
              ? 'border-primary/20 bg-primary/10 text-foreground'
              : 'border-border bg-card text-foreground',
            isHovered && 'shadow-md'
          )}
        >
          {!isOwn && showAvatar && authorLabel ? (
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary/90">{authorLabel}</p>
          ) : null}

          <div className="space-y-3">
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{getMessagePrimaryText(message)}</p>

            {shouldRenderAssetCards ? (
              <div className="space-y-2">
                {message.attachments.map((attachment) => {
                  const isAudio = message.type === 'AUDIO';
                  const isImage = isImageMimeType(attachment.mime_type);
                  const assetUrl = attachment.file_url;
                  const fileName = attachment.filename ?? 'attachment';

                  return (
                    <div key={attachment.id} className="overflow-hidden rounded-[20px] border border-border bg-background">
                      {isImage ? (
                        <a
                          href={assetUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block w-full bg-muted/40"
                          onClick={() => markViewed(attachment.id, attachment.view_once)}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={assetUrl} alt={fileName} className="max-h-80 w-full object-cover" />
                        </a>
                      ) : null}

                      <div className="space-y-3 px-3 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-secondary text-secondary-foreground">
                              {isAudio ? <FileAudio className="size-4" /> : isImage ? <FileImage className="size-4" /> : <FileText className="size-4" />}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">{fileName}</p>
                              <p className="text-xs text-muted-foreground">
                                {isAudio ? 'Voice note' : isImage ? 'Image attachment' : 'File attachment'} · {formatBytes(attachment.size_bytes)}
                              </p>
                            </div>
                          </div>

                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="rounded-full border-border bg-background"
                            asChild
                          >
                            <a href={assetUrl} download={fileName} onClick={() => markViewed(attachment.id, attachment.view_once)}>
                              <Download className="size-4" />
                              Save
                            </a>
                          </Button>
                        </div>

                        {isAudio ? (
                          <AudioPlayer
                            src={assetUrl}
                            onPlay={() => {
                              markViewed(attachment.id, attachment.view_once);
                              onPlayed?.(message.id);
                            }}
                          />
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>

          <div className="mt-2 flex items-center justify-end gap-2 text-[11px] font-medium text-muted-foreground">
            {message.edited_at ? <span>Edited</span> : null}
            {receiptIcon}
            <span>{formatTimestamp(message.created_at)}</span>
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
