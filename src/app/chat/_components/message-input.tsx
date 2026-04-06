"use client";

import { useCallback, useRef, useState } from "react";
import {
  LoaderCircle,
  Mic,
  Pencil,
  Send,
  Smile,
  StopCircle,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useMessageChannel } from "@/hooks/use-message-channel";
import { useTypingChannel } from "@/hooks/use-typing-channel";
import { useVoiceNote } from "@/hooks/use-voice-note";
import { useFileUploadMutation, useVoiceUploadMutation } from "@/queries/use-upload-queries";
import { useUiStore } from "@/stores/ui-store";
import { useUploadStore } from "@/stores/upload-store";
import { createClientMessageId } from "@/lib/request-id";
import { getMessagePrimaryText } from "@/lib/message-payload";
import { cn } from "@/lib/utils";
import { FileUploadButton } from "@/components/shared/file-upload-button";
import { UploadProgressList } from "@/components/shared/upload-progress-list";
import type { Message } from "@/types";

interface MessageInputProps {
  conversationId: string;
  replyToMessage?: Message | null;
  editingMessage?: Message | null;
  onCancelReply?: () => void;
  onCancelEdit?: () => void;
}

const EMOJI_SECTIONS = [
  {
    title: "Smileys",
    emojis: [
      "😀",
      "😁",
      "😂",
      "🤣",
      "😊",
      "😍",
      "😘",
      "😎",
      "🤔",
      "😭",
      "😡",
      "🥳",
      "👍",
      "👏",
      "🙏",
      "🔥",
    ],
  },
  {
    title: "Gestures",
    emojis: ["💯", "✅", "❌", "👌", "🤝", "🙌", "👀", "💪"],
  },
  {
    title: "Objects",
    emojis: ["❤️", "🎉", "✨", "🎯", "🚀", "📌", "💡", "📎"],
  },
] as const;

export function MessageInput({
  conversationId,
  replyToMessage,
  editingMessage,
  onCancelReply,
  onCancelEdit,
}: MessageInputProps) {
  const enterToSend = useUiStore((state) => state.preferences.enter_to_send);
  const { sendMessage, editMessage } = useMessageChannel(conversationId);
  const { sendTyping } = useTypingChannel(conversationId);
  const fileUpload = useFileUploadMutation();
  const voiceUpload = useVoiceUploadMutation();
  const voiceNote = useVoiceNote();
  const addUpload = useUploadStore((state) => state.addUpload);
  const updateUpload = useUploadStore((state) => state.updateUpload);
  const [text, setText] = useState(() =>
    editingMessage ? getMessagePrimaryText(editingMessage) : ""
  );
  const [error, setError] = useState<string | null>(null);
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Clear text when cancelling edit
  const handleCancelEdit = useCallback(() => {
    setText("");
    setIsEmojiPickerOpen(false);
    onCancelEdit?.();
  }, [onCancelEdit]);

  const insertEmoji = useCallback(
    (emoji: string) => {
      const input = inputRef.current;
      const start = input?.selectionStart ?? text.length;
      const end = input?.selectionEnd ?? text.length;
      const nextValue = `${text.slice(0, start)}${emoji}${text.slice(end)}`;

      setText(nextValue);
      sendTyping(nextValue.trim().length > 0);

      window.requestAnimationFrame(() => {
        const nextCursor = start + emoji.length;
        inputRef.current?.focus();
        inputRef.current?.setSelectionRange(nextCursor, nextCursor);
      });
    },
    [sendTyping, text]
  );

  const handleEmojiSelect = useCallback(
    (emoji: string) => {
      insertEmoji(emoji);
      setIsEmojiPickerOpen(false);
    },
    [insertEmoji]
  );

  const markUploadsError = useCallback(
    (uploadIds: string[], message: string) => {
      uploadIds.forEach((id) => updateUpload(id, { status: "error", error: message }));
    },
    [updateUpload]
  );

  const isBusy = fileUpload.isPending || voiceUpload.isPending || voiceNote.isRecording;

  const submitPayload = useCallback(
    async (
      content: string,
      type: "TEXT" | "AUDIO" | "FILE" | "SYSTEM",
      attachmentIds: string[] = [],
      replyToMessageId?: string
    ) => {
      return sendMessage(content, type, attachmentIds, replyToMessageId);
    },
    [sendMessage]
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
        // Handle edit mode
        if (editingMessage) {
          editMessage(editingMessage.id, trimmed);
          setText("");
          setIsEmojiPickerOpen(false);
          sendTyping(false);
          onCancelEdit?.();
          return;
        }

        // Handle reply mode or normal send
        await submitPayload(trimmed, "TEXT", [], replyToMessage?.id);
        setText("");
        setIsEmojiPickerOpen(false);
        sendTyping(false);
        onCancelReply?.();
      } catch (submitError) {
        setError(
          submitError instanceof Error ? submitError.message : "Unable to send the message."
        );
      }
    },
    [
      editMessage,
      editingMessage,
      onCancelEdit,
      onCancelReply,
      replyToMessage,
      sendTyping,
      submitPayload,
      text,
    ]
  );

  const handleFilesSelected = useCallback(
    async (files: File[]) => {
      setError(null);

      const uploadIds = files.map(
        (file) => `${conversationId}:${file.name}:${crypto.randomUUID()}`
      );

      files.forEach((file, index) => {
        const uploadId = uploadIds[index];
        addUpload({
          id: uploadId,
          conversation_id: conversationId,
          filename: file.name,
          mime_type: file.type || "application/octet-stream",
          progress: 0,
          status: "uploading",
        });
      });

      try {
        files.forEach((file, index) => {
          const id = uploadIds[index];
          updateUpload(id, { status: "uploading", progress: 5 });
        });

        const result = await fileUpload.mutateAsync({
          files,
          onProgress: (progress) => {
            uploadIds.forEach((id) => updateUpload(id, { status: "uploading", progress }));
          },
        });

        uploadIds.forEach((id) => updateUpload(id, { status: "registering", progress: 100 }));

        try {
          uploadIds.forEach((id) => updateUpload(id, { status: "sending", progress: 100 }));

          await submitPayload(
            "",
            "FILE",
            result.attachments.map((attachment) => attachment.id),
            replyToMessage?.id
          );
          onCancelReply?.();
        } catch (sendError) {
          const message =
            sendError instanceof Error
              ? sendError.message
              : "Upload finished, but the message could not be sent.";
          markUploadsError(uploadIds, message);
          setError(message);
          return;
        }

        uploadIds.forEach((id) => updateUpload(id, { status: "done", progress: 100 }));

        window.setTimeout(() => {
          uploadIds.forEach((id) => useUploadStore.getState().removeUpload(id));
        }, 2500);
      } catch (uploadError) {
        const message =
          uploadError instanceof Error ? uploadError.message : "Unable to upload files.";
        markUploadsError(uploadIds, message);
        setError(message);
      }
    },
    [
      addUpload,
      conversationId,
      fileUpload,
      markUploadsError,
      onCancelReply,
      replyToMessage,
      submitPayload,
      updateUpload,
    ]
  );

  const handleVoiceToggle = useCallback(async () => {
    setError(null);
    let uploadId: string | null = null;

    if (!voiceNote.isRecording) {
      try {
        await voiceNote.startRecording();
      } catch (recordError) {
        setError(
          recordError instanceof Error
            ? recordError.message
            : "Unable to access the microphone."
        );
      }
      return;
    }

    try {
      const recording = await voiceNote.stopRecording();
      uploadId = `voice:${createClientMessageId()}`;
      addUpload({
        id: uploadId,
        conversation_id: conversationId,
        filename: "voice-note.webm",
        mime_type: recording.mime_type,
        progress: 0,
        status: "uploading",
      });

      const result = await voiceUpload.mutateAsync({
        recording,
        onProgress: (progress) => {
          if (uploadId) {
            updateUpload(uploadId, { status: "uploading", progress });
          }
        },
      });

      if (uploadId) {
        updateUpload(uploadId, { status: "registering", progress: 100 });
      }

      try {
        if (uploadId) {
          updateUpload(uploadId, { status: "sending", progress: 100 });
        }

        await submitPayload("", "AUDIO", [result.attachment.id], replyToMessage?.id);
        onCancelReply?.();
      } catch (sendError) {
        const message =
          sendError instanceof Error
            ? sendError.message
            : "Voice note uploaded, but the message could not be sent.";
        if (uploadId) {
          updateUpload(uploadId, { status: "error", error: message });
        }
        setError(message);
        return;
      }

      if (uploadId) {
        updateUpload(uploadId, { status: "done", progress: 100 });
      }

      window.setTimeout(() => {
        if (uploadId) {
          useUploadStore.getState().removeUpload(uploadId);
        }
      }, 2500);
    } catch (voiceError) {
      const message =
        voiceError instanceof Error ? voiceError.message : "Unable to send the voice note.";
      if (uploadId) {
        updateUpload(uploadId, { status: "error", error: message });
      }
      setError(message);
    }
  }, [
    addUpload,
    conversationId,
    onCancelReply,
    replyToMessage,
    submitPayload,
    updateUpload,
    voiceNote,
    voiceUpload,
  ]);

  const isEditing = !!editingMessage;
  const isReplying = !!replyToMessage;
  const hasText = text.trim().length > 0;

  return (
    <div className="shrink-0 border-t border-[#e9edef] bg-[#f0f2f5] px-3 py-2 dark:border-[#2a3942] dark:bg-[#202c33]">
      <UploadProgressList conversationId={conversationId} />

      {/* Reply/Edit context bar */}
      {(isReplying || isEditing) && (
        <div
          className={cn(
            "mb-2 flex items-center gap-3 rounded-lg border-l-4 bg-card px-3 py-2",
            isEditing ? "border-amber-500" : "border-primary"
          )}
        >
          <div className="min-w-0 flex-1">
            <p
              className={cn(
                "text-xs font-medium",
                isEditing ? "text-amber-500" : "text-primary"
              )}
            >
              {isEditing ? "Editing message" : "Replying"}
            </p>
            <p className="truncate text-sm text-muted-foreground">
              {getMessagePrimaryText(isEditing ? editingMessage : replyToMessage!) ||
                "Attachment"}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 rounded-full"
            onClick={isEditing ? handleCancelEdit : onCancelReply}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Input area - WhatsApp style */}
      <form onSubmit={handleSubmit} className="flex items-end gap-1.5">
        {/* Emoji button */}
        <Popover open={isEmojiPickerOpen} onOpenChange={setIsEmojiPickerOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-10 w-10 shrink-0 rounded-full text-muted-foreground hover:bg-muted"
              aria-label="Open emoji picker"
            >
              <Smile className="h-6 w-6" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" side="top" className="w-[320px] p-2">
            <div className="max-h-72 space-y-3 overflow-y-auto pr-1">
              {EMOJI_SECTIONS.map((section) => (
                <div key={section.title}>
                  <p className="px-1 text-[11px] font-medium uppercase text-muted-foreground">
                    {section.title}
                  </p>
                  <div className="mt-1 grid grid-cols-8 gap-1">
                    {section.emojis.map((emoji) => (
                      <button
                        key={`${section.title}-${emoji}`}
                        type="button"
                        className="flex h-8 w-8 items-center justify-center rounded-md text-xl hover:bg-muted"
                        onClick={() => handleEmojiSelect(emoji)}
                        aria-label={`Insert ${emoji}`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Attachment button */}
        {!isEditing && (
          <FileUploadButton
            onFilesSelected={handleFilesSelected}
            disabled={isBusy}
            className="h-10 w-10 shrink-0 rounded-full text-muted-foreground hover:bg-muted [&_svg]:h-6 [&_svg]:w-6"
          />
        )}

        {/* Text input */}
        <div className="min-w-0 flex-1">
          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={(event) => {
              const nextValue = event.target.value;
              setText(nextValue);
              sendTyping(nextValue.trim().length > 0);
            }}
            onKeyDown={(event) => {
              // Escape cancels reply/edit
              if (event.key === "Escape") {
                if (isEditing) {
                  handleCancelEdit();
                } else if (isReplying) {
                  onCancelReply?.();
                }
                return;
              }

              if (!enterToSend) {
                return;
              }

              if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) {
                return;
              }

              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }}
            placeholder={
              isEditing
                ? "Edit message"
                : isReplying
                  ? "Type a reply"
                  : "Type a message"
            }
            className="h-10 w-full rounded-full bg-white px-4 text-[15px] focus:outline-none focus:ring-1 focus:ring-primary/30 dark:bg-[#2a3942]"
          />
        </div>

        {/* Send or Voice button */}
        {hasText || isEditing ? (
          <Button
            type="submit"
            size="icon"
            className={cn(
              "h-10 w-10 shrink-0 rounded-full",
              isEditing && "bg-amber-500 hover:bg-amber-600"
            )}
            disabled={!hasText || isBusy}
            aria-label={isEditing ? "Save edited message" : "Send message"}
          >
            {isBusy ? (
              <LoaderCircle className="h-5 w-5 animate-spin" />
            ) : isEditing ? (
              <Pencil className="h-5 w-5" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        ) : (
          <Button
            type="button"
            size="icon"
            className={cn(
              "h-10 w-10 shrink-0 rounded-full",
              voiceNote.isRecording && "bg-destructive hover:bg-destructive/90"
            )}
            onClick={handleVoiceToggle}
            disabled={voiceUpload.isPending}
            aria-label={voiceNote.isRecording ? "Stop recording and send" : "Record voice message"}
          >
            {voiceNote.isRecording ? (
              <StopCircle className="h-5 w-5" />
            ) : (
              <Mic className="h-5 w-5" />
            )}
          </Button>
        )}
      </form>

      {/* Error message */}
      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}

      {/* Recording indicator */}
      {voiceNote.isRecording && (
        <div className="mt-2 flex items-center gap-2 text-xs text-destructive">
          <span className="h-2 w-2 animate-pulse rounded-full bg-destructive" />
          Recording... Tap to send
        </div>
      )}
    </div>
  );
}
