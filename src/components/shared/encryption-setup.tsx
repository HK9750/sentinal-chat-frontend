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
  
  const generateKeysMutation = useGenerateKeys();
  const { isSetup, isLoading: statusLoading, deviceId } = useEncryptionStatus();

  useEffect(() => {
    if (isSetup && !statusLoading) {
      setStep('complete');
    }
  }, [isSetup, statusLoading]);

  const handleSetup = useCallback(async () => {
    setStep('generating');
    setError(null);

    try {
      await generateKeysMutation.mutateAsync();
      setStep('complete');
      onComplete?.();
    } catch (err) {
      console.error('Key generation failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate encryption keys. Please try again.');
      setStep('error');
    }
  }, [generateKeysMutation, onComplete]);

  const handleClose = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  const isProcessing = step === 'generating' || generateKeysMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={step === 'complete' || step === 'idle' ? onOpenChange : undefined}>
      <DialogContent
        showCloseButton={step === 'complete' || step === 'error' || step === 'idle'}
        className="bg-slate-900/95 border-slate-700 backdrop-blur-xl sm:max-w-lg"
      >
        <DialogHeader className="items-center space-y-4">
          <div
            className={cn(
              'flex h-16 w-16 items-center justify-center rounded-full',
              step === 'complete' && 'bg-emerald-500/20',
              step === 'error' && 'bg-red-500/20',
              (step === 'idle' || isProcessing) && 'bg-blue-500/20'
            )}
          >
            {step === 'complete' ? (
              <CheckCircle2 className="h-8 w-8 text-emerald-500" />
            ) : step === 'error' ? (
              <AlertCircle className="h-8 w-8 text-red-500" />
            ) : isProcessing ? (
              <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
            ) : (
              <Shield className="h-8 w-8 text-blue-500" />
            )}
          </div>
          <div className="text-center">
            <DialogTitle className="text-xl text-slate-100">
              {step === 'complete'
                ? 'Encryption Ready'
                : step === 'error'
                  ? 'Setup Failed'
                  : isProcessing
                    ? 'Generating Keys...'
                    : 'Set Up End-to-End Encryption'}
            </DialogTitle>
            <DialogDescription className="text-slate-400 mt-2">
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
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
                <span className="text-sm text-slate-300">
                  Generating identity key (Ed25519)
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-700 text-slate-400 text-sm font-medium">
                  2
                </div>
                <span className="text-sm text-slate-400">
                  Generating signed prekey (X25519)
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-700 text-slate-400 text-sm font-medium">
                  3
                </div>
                <span className="text-sm text-slate-400">
                  Generating {INITIAL_PREKEY_COUNT} one-time prekeys
                </span>
              </div>
            </div>
          </div>
        )}

        {step === 'idle' && !isProcessing && (
          <div className="py-4 space-y-4">
            <Card className="bg-slate-800/50 border-slate-700 p-4">
              <div className="flex gap-3">
                <Key className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-slate-200">Identity Key (Ed25519)</p>
                  <p className="text-xs text-slate-400">
                    A long-term signing key that identifies you on this device
                  </p>
                </div>
              </div>
            </Card>
            <Card className="bg-slate-800/50 border-slate-700 p-4">
              <div className="flex gap-3">
                <Lock className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-slate-200">Signed Prekey (X25519)</p>
                  <p className="text-xs text-slate-400">
                    A medium-term key signed by your identity key for secure key exchange
                  </p>
                </div>
              </div>
            </Card>
            <Card className="bg-slate-800/50 border-slate-700 p-4">
              <div className="flex gap-3">
                <Shield className="h-5 w-5 text-purple-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-slate-200">One-Time Prekeys</p>
                  <p className="text-xs text-slate-400">
                    {INITIAL_PREKEY_COUNT} single-use keys for establishing new secure sessions (X3DH)
                  </p>
                </div>
              </div>
            </Card>
            
            <div className="text-xs text-slate-500 text-center mt-4">
              Uses Signal Protocol with X25519 Diffie-Hellman and XChaCha20-Poly1305 encryption
            </div>
          </div>
        )}

        {step === 'complete' && (
          <div className="py-4 space-y-4">
            <Card className="bg-emerald-500/10 border-emerald-500/30 p-4">
              <div className="flex gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-slate-200">Keys Generated & Stored</p>
                  <p className="text-xs text-slate-400">
                    Your private keys are stored securely in your browser. Public keys have been
                    uploaded to enable encrypted messaging.
                  </p>
                </div>
              </div>
            </Card>
            
            {deviceId && (
              <Card className="bg-slate-800/50 border-slate-700 p-4">
                <div className="flex gap-3">
                  <Key className="h-5 w-5 text-slate-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-slate-200">Device ID</p>
                    <p className="text-xs text-slate-500 font-mono break-all">{deviceId}</p>
                  </div>
                </div>
              </Card>
            )}
          </div>
        )}

        {step === 'error' && (
          <div className="py-4">
            <Card className="bg-red-500/10 border-red-500/30 p-4">
              <div className="flex gap-3">
                <AlertCircle className="h-5 w-5 text-red-400 shrink-0" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-slate-200">Setup Failed</p>
                  <p className="text-xs text-slate-400">
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
                className="text-slate-400 hover:text-slate-200"
              >
                Later
              </Button>
              <Button
                onClick={handleSetup}
                className="bg-blue-600 hover:bg-blue-700"
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
                className="text-slate-400 hover:text-slate-200"
              >
                Cancel
              </Button>
              <Button onClick={handleSetup} className="bg-blue-600 hover:bg-blue-700">
                Try Again
              </Button>
            </>
          )}
          {step === 'complete' && (
            <Button onClick={handleClose} className="bg-emerald-600 hover:bg-emerald-700">
              Done
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
