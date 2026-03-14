'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, Download, KeyRound, Upload } from 'lucide-react';
import { parseConversationAccessCode } from '@/lib/crypto';
import { ensureConversationKey, getConversationKey, saveConversationKey } from '@/lib/crypto-storage';
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

  const handleGenerate = useCallback(async () => {
    setBusy(true);
    setMessage(null);

    try {
      await ensureConversationKey(conversationId);
      setHasKey(true);
      setMessage('Local conversation key is ready. Share its access code with trusted devices manually.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to create a local conversation key.');
    } finally {
      setBusy(false);
    }
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
    <div className="border-b border-border/70 bg-background/45 px-4 py-3">
      <div className="flex flex-col gap-3 rounded-[22px] border border-border/70 bg-background/65 px-4 py-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <KeyRound className="size-4" />
          </div>
          <div>
            <p className="text-sm font-semibold">{hasKey ? 'Conversation key is on this device' : 'This device is missing the conversation key'}</p>
            <p className="text-xs text-muted-foreground">
              {hasKey
                ? 'Export the access code to trusted devices so they can decrypt the same thread.'
                : 'Import an access code or generate a new local key for future messages.'}
            </p>
            {message ? <p className="mt-1 text-xs text-muted-foreground">{message}</p> : null}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {hasKey ? (
            <Button type="button" variant="outline" size="sm" onClick={handleExport} disabled={busy}>
              {isCopied ? <Check className="size-4" /> : <Download className="size-4" />}
              {isCopied ? 'Copied' : 'Copy access code'}
            </Button>
          ) : (
            <>
              <Button type="button" variant="outline" size="sm" onClick={handleImport} disabled={busy}>
                <Upload className="size-4" />
                Import code
              </Button>
              <Button type="button" size="sm" onClick={handleGenerate} disabled={busy}>
                <KeyRound className="size-4" />
                Generate local key
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
