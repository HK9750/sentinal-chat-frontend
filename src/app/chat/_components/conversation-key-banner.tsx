'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, Download, KeyRound, Upload } from 'lucide-react';
import { parseConversationAccessCode } from '@/lib/crypto';
import { getConversationKey, saveConversationKey } from '@/lib/crypto-storage';
import { Button } from '@/components/ui/button';
import { useEncryption } from '@/hooks/use-encryption';

interface ConversationKeyBannerProps {
  conversationId: string;
}

export function ConversationKeyBanner({ conversationId }: ConversationKeyBannerProps) {
  const { exportConversationAccess } = useEncryption();
  const [hasKey, setHasKey] = useState(() => Boolean(getConversationKey(conversationId)));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    setHasKey(Boolean(getConversationKey(conversationId)));
    setMessage(null);
    setIsCopied(false);
  }, [conversationId]);

  const handleImport = useCallback(async () => {
    const rawCode = window.prompt('Paste the conversation access code for this thread.');

    if (!rawCode) {
      return;
    }

    setBusy(true);
    setMessage(null);

    try {
      const record = await parseConversationAccessCode(rawCode);

      if (record.conversation_id !== conversationId) {
        throw new Error('That access code belongs to a different conversation.');
      }

      saveConversationKey(record);
      setHasKey(true);
      setMessage('Access code imported. This device can now decrypt the conversation.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to import that access code.');
    } finally {
      setBusy(false);
    }
  }, [conversationId]);

  const handleExport = useCallback(async () => {
    setBusy(true);
    setMessage(null);

    try {
      const access = await exportConversationAccess(conversationId);
      await navigator.clipboard.writeText(access.code);
      setIsCopied(true);
      setMessage(`Access code copied. Fingerprint: ${access.fingerprint}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to export the access code.');
    } finally {
      setBusy(false);
    }
  }, [conversationId, exportConversationAccess]);

  return (
    <div className="border-b border-border px-4 py-3">
      <div className="flex flex-col gap-3 rounded-[24px] border border-border bg-card px-4 py-3 shadow-sm md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <KeyRound className="size-4" />
          </div>
          <div>
            <p className="text-sm font-semibold">{hasKey ? 'Conversation key is on this device' : 'This device is missing the conversation key'}</p>
            <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
              {hasKey
                ? 'Export the access code to trusted devices so they can decrypt the same thread.'
                : 'Import an access code or generate a new local key for future messages.'}
            </p>
            {message ? <p className="mt-2 text-xs text-muted-foreground">{message}</p> : null}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {hasKey ? (
            <Button type="button" variant="outline" size="sm" className="rounded-full border-border bg-background" onClick={handleExport} disabled={busy}>
              {isCopied ? <Check className="size-4" /> : <Download className="size-4" />}
              {isCopied ? 'Copied' : 'Copy access code'}
            </Button>
          ) : (
            <>
              <Button type="button" variant="outline" size="sm" className="rounded-full border-border bg-background" onClick={handleImport} disabled={busy}>
                <Upload className="size-4" />
                Import code
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
