'use client';

import { Download, FileAudio, FileText, ShieldAlert } from 'lucide-react';
import { useState } from 'react';
import { UserAvatar } from '@/components/shared/user-avatar';
import { Button } from '@/components/ui/button';
import { cn, formatTimestamp } from '@/lib/utils';
import { getMessageAssetManifests, getMessagePrimaryText, isRenderableTextPayload } from '@/lib/message-payload';
import { openEncryptedAttachment } from '@/services/encryption-service';
import type { DecryptedMessageState, Message } from '@/types';

interface MessageBubbleProps {
  conversationId: string;
  message: Message;
  decrypted: DecryptedMessageState;
  isOwn: boolean;
  showAvatar: boolean;
  authorLabel?: string;
  avatarUrl?: string | null;
}

export function MessageBubble({
  conversationId,
  message,
  decrypted,
  isOwn,
  showAvatar,
  authorLabel,
  avatarUrl,
}: MessageBubbleProps) {
  const payload = decrypted.status === 'ready' ? decrypted.payload : undefined;
  const manifests = getMessageAssetManifests(payload);
  const showWarning = decrypted.status === 'missing-key' || decrypted.status === 'error';
  const [attachmentError, setAttachmentError] = useState<string | null>(null);

  return (
    <div className={cn('flex gap-2', isOwn ? 'justify-end' : 'justify-start')}>
      {!isOwn ? (
        showAvatar ? <UserAvatar src={avatarUrl} alt={authorLabel} fallback={authorLabel?.[0] ?? 'U'} size="sm" /> : <div className="size-8 shrink-0" />
      ) : null}

      <div
        className={cn(
          'max-w-[78%] rounded-[12px] border px-3 py-2 shadow-sm',
          isOwn
            ? 'border-primary/15 bg-[#d9fdd3] text-slate-900'
            : 'border-border/40 bg-white text-slate-900'
        )}
      >
        {!isOwn && showAvatar && authorLabel ? <p className="mb-1 text-xs font-semibold text-primary">{authorLabel}</p> : null}

        <div className="space-y-3">
          <p className="whitespace-pre-wrap text-sm leading-relaxed">
            {showWarning ? (
              <span className="inline-flex items-start gap-2 text-destructive">
                <ShieldAlert className="mt-0.5 size-4 shrink-0" />
                {getMessagePrimaryText(decrypted)}
              </span>
            ) : (
              getMessagePrimaryText(decrypted)
            )}
          </p>

          {payload && !isRenderableTextPayload(payload) ? (
            <div className="space-y-2">
              {manifests.map((manifest, index) => {
                const attachment = message.attachments.find((item) => item.id === manifest.attachment_id) ?? message.attachments[index];

                if (!attachment) {
                  return null;
                }

                const isAudio = payload.kind === 'audio';

                return (
                  <div key={manifest.file_id} className="rounded-2xl border border-border/70 bg-background/55 px-3 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-secondary text-secondary-foreground">
                          {isAudio ? <FileAudio className="size-4" /> : <FileText className="size-4" />}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{manifest.filename}</p>
                          <p className="text-xs text-muted-foreground">{isAudio ? 'Encrypted voice note' : 'Encrypted file attachment'}</p>
                        </div>
                      </div>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          try {
                            setAttachmentError(null);
                            const blob = await openEncryptedAttachment(conversationId, attachment, manifest);
                            const url = URL.createObjectURL(blob);
                            window.open(url, '_blank', 'noopener,noreferrer');
                            window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
                          } catch (error) {
                            setAttachmentError(error instanceof Error ? error.message : 'Unable to open encrypted attachment.');
                          }
                        }}
                      >
                        <Download className="size-4" />
                        Open
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}

          {attachmentError ? <p className="text-xs text-destructive">{attachmentError}</p> : null}
        </div>

        <div className="mt-1 flex items-center justify-end gap-2 text-[11px] text-muted-foreground">
          {message.edited_at ? <span>Edited</span> : null}
          <span>{formatTimestamp(message.created_at)}</span>
        </div>
      </div>
    </div>
  );
}
