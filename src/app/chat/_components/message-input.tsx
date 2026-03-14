'use client';

import { useCallback, useMemo, useState } from 'react';
import { LoaderCircle, Mic, Send, StopCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useEncryption } from '@/hooks/use-encryption';
import { useFileEncryption } from '@/hooks/use-file-encryption';
import { useMessageChannel } from '@/hooks/use-message-channel';
import { useTypingChannel } from '@/hooks/use-typing-channel';
import { useVoiceNote } from '@/hooks/use-voice-note';
import { useEncryptedVoiceUploadMutation } from '@/queries/use-upload-queries';
import { useAuthStore } from '@/stores/auth-store';
import { useUploadStore } from '@/stores/upload-store';
import { createClientMessageId } from '@/lib/crypto';
import type { SecureMessagePayload } from '@/types';
import { FileUploadButton } from '@/components/shared/file-upload-button';
import { UploadProgressList } from '@/components/shared/upload-progress-list';

interface MessageInputProps {
  conversationId: string;
}

export function MessageInput({ conversationId }: MessageInputProps) {
  const currentUserId = useAuthStore((state) => state.user?.id);
  const { encryptForConversation } = useEncryption();
  const { sendMessage } = useMessageChannel(conversationId);
  const { sendTyping } = useTypingChannel(conversationId);
  const fileEncryption = useFileEncryption(conversationId);
  const voiceUpload = useEncryptedVoiceUploadMutation(conversationId);
  const voiceNote = useVoiceNote();
  const addUpload = useUploadStore((state) => state.addUpload);
  const updateUpload = useUploadStore((state) => state.updateUpload);
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const isBusy = fileEncryption.isPending || voiceUpload.isPending || voiceNote.isRecording;

  const submitPayload = useCallback(
    async (payload: SecureMessagePayload) => {
      const encryptedContent = await encryptForConversation(conversationId, payload);
      return sendMessage(encryptedContent, payload.kind === 'audio' ? 'AUDIO' : payload.kind === 'file' ? 'FILE' : payload.kind === 'system' ? 'SYSTEM' : 'TEXT');
    },
    [conversationId, encryptForConversation, sendMessage]
  );

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const trimmed = text.trim();

      if (!trimmed) {
        return;
      }

      setError(null);

      try {
        await submitPayload({ kind: 'text', text: trimmed });
        setText('');
        sendTyping(false);
      } catch (submitError) {
        setError(submitError instanceof Error ? submitError.message : 'Unable to send the message.');
      }
    },
    [sendTyping, submitPayload, text]
  );

  const handleFilesSelected = useCallback(
    async (files: File[]) => {
      setError(null);

      for (const file of files) {
        addUpload({
          id: `${conversationId}:${file.name}:${crypto.randomUUID()}`,
          conversation_id: conversationId,
          filename: file.name,
          mime_type: file.type || 'application/octet-stream',
          progress: 0,
          status: 'encrypting',
        });
      }

      try {
        const uploadIds = useUploadStore
          .getState()
          .items.filter((item) => item.conversation_id === conversationId)
          .slice(-files.length)
          .map((item) => item.id);

        const result = await fileEncryption.mutateAsync(files, {
          onSuccess: undefined,
        } as never);

        uploadIds.forEach((id) => updateUpload(id, { status: 'done', progress: 100 }));

        await submitPayload({
          kind: 'file',
          files: result.manifests,
          caption: '',
        });
      } catch (uploadError) {
        const message = uploadError instanceof Error ? uploadError.message : 'Unable to upload encrypted files.';
        setError(message);
      }
    },
    [addUpload, conversationId, fileEncryption, submitPayload, updateUpload]
  );

  const handleVoiceToggle = useCallback(async () => {
    setError(null);

    if (!voiceNote.isRecording) {
      try {
        await voiceNote.startRecording();
      } catch (recordError) {
        setError(recordError instanceof Error ? recordError.message : 'Unable to access the microphone.');
      }
      return;
    }

    try {
      const recording = await voiceNote.stopRecording();
      const uploadId = `voice:${createClientMessageId()}`;
      addUpload({
        id: uploadId,
        conversation_id: conversationId,
        filename: 'voice-note.webm',
        mime_type: recording.mime_type,
        progress: 0,
        status: 'encrypting',
      });

      const result = await voiceUpload.mutateAsync(recording, {
        onSuccess: undefined,
      } as never);

      updateUpload(uploadId, { status: 'done', progress: 100 });

      await submitPayload({
        kind: 'audio',
        transcript: '',
        duration_ms: recording.duration_ms,
        clips: [result.manifest],
      });
    } catch (voiceError) {
      setError(voiceError instanceof Error ? voiceError.message : 'Unable to send the encrypted voice note.');
    }
  }, [addUpload, conversationId, submitPayload, updateUpload, voiceNote, voiceUpload]);

  const helperText = useMemo(() => {
    if (!currentUserId) {
      return 'Sign in again if sending stops working.';
    }

    return 'Messages, files, and voice notes are encrypted before they leave this browser.';
  }, [currentUserId]);

  return (
    <div className="border-t border-border/70 bg-background/65">
      <UploadProgressList conversationId={conversationId} />

      <form onSubmit={handleSubmit} className="mx-auto flex w-full max-w-4xl flex-col gap-3 px-4 py-4">
        <Textarea
          value={text}
          onChange={(event) => {
            const nextValue = event.target.value;
            setText(nextValue);
            sendTyping(nextValue.trim().length > 0);
          }}
          placeholder="Write an encrypted message"
          className="min-h-24 rounded-[24px] border-border/70 bg-background/70 px-4 py-3"
        />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <FileUploadButton onFilesSelected={handleFilesSelected} disabled={isBusy} className="rounded-full" />
            <Button type="button" variant="outline" size="sm" onClick={handleVoiceToggle} disabled={voiceUpload.isPending}>
              {voiceNote.isRecording ? <StopCircle className="size-4" /> : <Mic className="size-4" />}
              {voiceNote.isRecording ? 'Stop voice note' : 'Record voice note'}
            </Button>
            <span className="text-xs text-muted-foreground">{helperText}</span>
          </div>

          <Button type="submit" disabled={!text.trim() || isBusy}>
            {isBusy ? <LoaderCircle className="size-4 animate-spin" /> : <Send className="size-4" />}
            Send
          </Button>
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </form>
    </div>
  );
}
