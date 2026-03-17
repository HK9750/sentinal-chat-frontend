'use client';

import { Check, CheckCheck, Download, FileAudio, FileImage, FileText } from 'lucide-react';
import { useMemo } from 'react';
import { UserAvatar } from '@/components/shared/user-avatar';
import { Button } from '@/components/ui/button';
import { cn, formatBytes, formatTimestamp, isImageMimeType } from '@/lib/utils';
import { getMessagePrimaryText } from '@/lib/message-payload';
import type { Message } from '@/types';

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  showAvatar: boolean;
  authorLabel?: string;
  avatarUrl?: string | null;
  onPlayed?: (messageId: string) => void;
}

export function MessageBubble({
  message,
  isOwn,
  showAvatar,
  authorLabel,
  avatarUrl,
  onPlayed,
}: MessageBubbleProps) {
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

  return (
    <div className={cn('flex gap-2.5', isOwn ? 'justify-end' : 'justify-start')}>
      {!isOwn ? (
        showAvatar ? <UserAvatar src={avatarUrl} alt={authorLabel} fallback={authorLabel?.[0] ?? 'U'} size="sm" /> : <div className="size-8 shrink-0" />
      ) : null}

      <div
        className={cn(
          'max-w-[82%] rounded-[24px] border px-4 py-3 shadow-sm',
          isOwn
            ? 'border-primary/20 bg-primary/10 text-foreground'
            : 'border-border bg-card text-foreground'
        )}
      >
        {!isOwn && showAvatar && authorLabel ? <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary/90">{authorLabel}</p> : null}

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
                      <a href={assetUrl} target="_blank" rel="noopener noreferrer" className="block w-full bg-muted/40">
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
                          <a href={assetUrl} download={fileName}>
                            <Download className="size-4" />
                            Save
                          </a>
                        </Button>
                      </div>

                      {isAudio ? (
                        <audio controls preload="metadata" className="h-10 w-full" src={assetUrl} onPlay={() => onPlayed?.(message.id)} />
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
    </div>
  );
}
