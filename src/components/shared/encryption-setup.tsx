'use client';

import { useCallback, useMemo, useState } from 'react';
import { CheckCircle2, Download, KeyRound, Shield, Upload } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useEncryption } from '@/hooks/use-encryption';

interface EncryptionSetupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: () => void;
}

export function EncryptionSetup({ open, onOpenChange, onComplete }: EncryptionSetupProps) {
  const { exportVaultBackup, importVaultBackup } = useEncryption();
  const [payload, setPayload] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const helperText = useMemo(
    () =>
      'Conversation keys stay in this browser. Export a vault backup to move them to another trusted device, then import the backup there manually.',
    []
  );

  const handleExport = useCallback(async () => {
    try {
      const backup = exportVaultBackup();
      setPayload(backup);
      await navigator.clipboard.writeText(backup);
      setCopied(true);
      setStatus('Vault backup copied. Store it somewhere private before leaving this device.');
      onComplete?.();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Unable to export the local vault backup.');
      setCopied(false);
    }
  }, [exportVaultBackup, onComplete]);

  const handleImport = useCallback(() => {
    try {
      const importedCount = importVaultBackup(payload.trim());
      setStatus(`Imported ${importedCount} conversation key${importedCount === 1 ? '' : 's'} into this browser.`);
      onComplete?.();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Unable to import that vault backup.');
    }
  }, [importVaultBackup, onComplete, payload]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border/70 bg-background/95 backdrop-blur-xl sm:max-w-2xl">
        <DialogHeader>
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/12 text-primary">
            <Shield className="size-6" />
          </div>
          <DialogTitle className="text-xl">Encryption vault tools</DialogTitle>
          <DialogDescription>{helperText}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-2">
          <Card className="border-border/70 bg-background/60 p-4">
            <div className="flex items-start gap-3">
              <Download className="mt-0.5 size-4 text-primary" />
              <div>
                <h3 className="font-semibold">Export local backup</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Copy every saved conversation access record into a single portable backup string.
                </p>
              </div>
            </div>
            <Button type="button" className="mt-4 w-full" onClick={handleExport}>
              {copied ? <CheckCircle2 className="size-4" /> : <Download className="size-4" />}
              {copied ? 'Copied backup' : 'Copy vault backup'}
            </Button>
          </Card>

          <Card className="border-border/70 bg-background/60 p-4">
            <div className="flex items-start gap-3">
              <Upload className="mt-0.5 size-4 text-primary" />
              <div>
                <h3 className="font-semibold">Import existing backup</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Paste a backup from another trusted device to restore local decryption access here.
                </p>
              </div>
            </div>
            <Button type="button" variant="outline" className="mt-4 w-full" onClick={handleImport} disabled={!payload.trim()}>
              <KeyRound className="size-4" />
              Import vault backup
            </Button>
          </Card>
        </div>

        <div className="space-y-2">
          <label htmlFor="vault-backup" className="text-sm font-medium">
            Vault backup payload
          </label>
          <Textarea
            id="vault-backup"
            value={payload}
            onChange={(event) => {
              setPayload(event.target.value);
              setCopied(false);
              setStatus(null);
            }}
            placeholder="Paste an exported vault backup here or generate one from this device."
            className="min-h-40 rounded-[22px] border-border/70 bg-background/70"
          />
        </div>

        {status ? <p className="text-sm text-muted-foreground">{status}</p> : null}

        <div className="flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
