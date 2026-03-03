'use client';

import { useState, useCallback, useEffect } from 'react';
import { Shield, Key, CheckCircle2, AlertCircle, Loader2, Lock } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useGenerateKeys, useEncryptionStatus, useReplenishPreKeys } from '@/hooks/use-encryption';
import { cn } from '@/lib/utils';

const INITIAL_PREKEY_COUNT = 20;

type SetupStep = 'idle' | 'generating' | 'complete' | 'error';

interface EncryptionSetupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: () => void;
}

export function EncryptionSetup({
  open,
  onOpenChange,
  onComplete,
}: EncryptionSetupProps) {
  const [step, setStep] = useState<SetupStep>('idle');
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState('');

  const generateKeysMutation = useGenerateKeys();
  const { isSetup, isLoading: statusLoading, deviceId } = useEncryptionStatus();

  useEffect(() => {
    if (isSetup && !statusLoading) {
      setStep('complete');
    }
  }, [isSetup, statusLoading]);

  const handleSetup = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!password) {
      setError('Password is required to encrypt your backup.');
      return;
    }

    setStep('generating');
    setError(null);

    try {
      await generateKeysMutation.mutateAsync(password);
      setStep('complete');
      onComplete?.();
    } catch (err) {
      console.error('Key generation failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate encryption keys. Please try again.');
      setStep('error');
    }
  }, [generateKeysMutation, onComplete, password]);

  const handleClose = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  const isProcessing = step === 'generating' || generateKeysMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={step === 'complete' || step === 'idle' ? onOpenChange : undefined}>
      <DialogContent
        showCloseButton={step === 'complete' || step === 'error' || step === 'idle'}
        className="bg-background/95 border-border backdrop-blur-xl sm:max-w-lg"
      >
        <DialogHeader className="items-center space-y-4">
          <div
            className={cn(
              'flex h-16 w-16 items-center justify-center rounded-full',
              step === 'complete' && 'bg-green-500/20',
              step === 'error' && 'bg-destructive/20',
              (step === 'idle' || isProcessing) && 'bg-primary/20'
            )}
          >
            {step === 'complete' ? (
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            ) : step === 'error' ? (
              <AlertCircle className="h-8 w-8 text-destructive" />
            ) : isProcessing ? (
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
            ) : (
              <Shield className="h-8 w-8 text-primary" />
            )}
          </div>
          <div className="text-center">
            <DialogTitle className="text-xl text-foreground">
              {step === 'complete'
                ? 'Encryption Ready'
                : step === 'error'
                  ? 'Setup Failed'
                  : isProcessing
                    ? 'Generating Keys...'
                    : 'Set Up End-to-End Encryption'}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground mt-2">
              {step === 'complete'
                ? 'Your messages are now protected with end-to-end encryption using the Signal Protocol.'
                : step === 'error'
                  ? error || 'An error occurred during setup.'
                  : isProcessing
                    ? 'Please wait while we generate your secure encryption keys...'
                    : 'Generate secure encryption keys to protect your messages with the Signal Protocol.'}
            </DialogDescription>
          </div>
        </DialogHeader>

        {isProcessing && (
          <div className="py-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
                <span className="text-sm text-foreground">
                  Generating identity key (Ed25519)
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground text-sm font-medium">
                  2
                </div>
                <span className="text-sm text-muted-foreground">
                  Generating signed prekey (X25519)
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground text-sm font-medium">
                  3
                </div>
                <span className="text-sm text-muted-foreground">
                  Generating {INITIAL_PREKEY_COUNT} one-time prekeys
                </span>
              </div>
            </div>
          </div>
        )}

        {step === 'idle' && !isProcessing && (
          <div className="py-4 space-y-4">
            <Card className="bg-card border-border p-4">
              <div className="flex gap-3">
                <Key className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">Identity Key (Ed25519)</p>
                  <p className="text-xs text-muted-foreground">
                    A long-term signing key that identifies you on this device
                  </p>
                </div>
              </div>
            </Card>
            <Card className="bg-card border-border p-4">
              <div className="flex gap-3">
                <Lock className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">Signed Prekey (X25519)</p>
                  <p className="text-xs text-muted-foreground">
                    A medium-term key signed by your identity key for secure key exchange
                  </p>
                </div>
              </div>
            </Card>
            <Card className="bg-card border-border p-4">
              <div className="flex gap-3">
                <Shield className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">One-Time Prekeys</p>
                  <p className="text-xs text-muted-foreground">
                    {INITIAL_PREKEY_COUNT} single-use keys for establishing new secure sessions (X3DH)
                  </p>
                </div>
              </div>
            </Card>

            <div className="text-xs text-muted-foreground text-center mt-4">
              Uses Signal Protocol with X25519 Diffie-Hellman and XChaCha20-Poly1305 encryption
            </div>

            <form onSubmit={handleSetup} className="mt-6 space-y-3">
              <label htmlFor="encryption-password" className="block text-sm font-medium text-foreground">
                Confirm Password to Encrypt Escrow Backup
              </label>
              <input
                id="encryption-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your account password"
                required
                className="w-full px-3 py-2 bg-background border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <p className="text-xs text-muted-foreground">
                Your password securely encrypts your local keys before backup. The server cannot read them.
              </p>
              {error && <p className="text-xs text-destructive">{error}</p>}
            </form>
          </div>
        )}

        {step === 'complete' && (
          <div className="py-4 space-y-4">
            <Card className="bg-green-500/10 border-green-500/30 p-4">
              <div className="flex gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">Keys Generated & Stored</p>
                  <p className="text-xs text-muted-foreground">
                    Your private keys are stored securely in your browser. Public keys have been
                    uploaded to enable encrypted messaging.
                  </p>
                </div>
              </div>
            </Card>

            {deviceId && (
              <Card className="bg-card border-border p-4">
                <div className="flex gap-3">
                  <Key className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">Device ID</p>
                    <p className="text-xs text-muted-foreground font-mono break-all">{deviceId}</p>
                  </div>
                </div>
              </Card>
            )}
          </div>
        )}

        {step === 'error' && (
          <div className="py-4">
            <Card className="bg-destructive/10 border-destructive/30 p-4">
              <div className="flex gap-3">
                <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">Setup Failed</p>
                  <p className="text-xs text-muted-foreground">
                    {error || 'An unexpected error occurred. Please try again.'}
                  </p>
                </div>
              </div>
            </Card>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4">
          {step === 'idle' && !isProcessing && (
            <>
              <Button
                variant="ghost"
                onClick={() => onOpenChange(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                Later
              </Button>
              <Button
                onClick={() => handleSetup()}
                disabled={!password}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                <Shield className="h-4 w-4 mr-2" />
                Generate Keys
              </Button>
            </>
          )}
          {step === 'error' && (
            <>
              <Button
                variant="ghost"
                onClick={() => onOpenChange(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                Cancel
              </Button>
              <Button onClick={handleSetup} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                Try Again
              </Button>
            </>
          )}
          {step === 'complete' && (
            <Button onClick={handleClose} className="bg-green-500 hover:bg-green-600 text-white">
              Done
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
