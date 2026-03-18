"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CornerUpLeft, LoaderCircle, Mic, Pencil, RotateCcw, RotateCw, Send, StopCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useMessageChannel } from "@/hooks/use-message-channel";
import { useTypingChannel } from "@/hooks/use-typing-channel";
import { useVoiceNote } from "@/hooks/use-voice-note";
import { useFileUploadMutation, useVoiceUploadMutation } from "@/queries/use-upload-queries";
import { useAuthStore } from "@/stores/auth-store";
import { useUiStore } from "@/stores/ui-store";
import { useUploadStore } from "@/stores/upload-store";
import { useChatStore } from "@/stores/chat-store";
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

export function MessageInput({
  conversationId,
  replyToMessage,
  editingMessage,
  onCancelReply,
  onCancelEdit,
}: MessageInputProps) {
  const currentUserId = useAuthStore((state) => state.user?.id);
  const enterToSend = useUiStore((state) => state.preferences.enter_to_send);
  const { sendMessage, editMessage, undoLatest, redoCommand } = useMessageChannel(conversationId);
  const { sendTyping } = useTypingChannel(conversationId);
  const fileUpload = useFileUploadMutation();
  const voiceUpload = useVoiceUploadMutation();
  const voiceNote = useVoiceNote();
  const lastUndoneCommandId = useChatStore((state) => state.lastUndoneCommandByConversation[conversationId]);
  const addUpload = useUploadStore((state) => state.addUpload);
  const updateUpload = useUploadStore((state) => state.updateUpload);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Set text to editing message content when entering edit mode
  useEffect(() => {
    if (editingMessage) {
      const content = getMessagePrimaryText(editingMessage);
      setText(content);
    }
  }, [editingMessage]);

  // Clear text when cancelling edit
  const handleCancelEdit = useCallback(() => {
    setText("");
    onCancelEdit?.();
  }, [onCancelEdit]);

  const markUploadsError = useCallback(
    (uploadIds: string[], message: string) => {
      uploadIds.forEach((id) => updateUpload(id, { status: "error", error: message }));
    },
    [updateUpload],
  );

  const isBusy =
    fileUpload.isPending || voiceUpload.isPending || voiceNote.isRecording;

  const submitPayload = useCallback(
    async (content: string, type: "TEXT" | "AUDIO" | "FILE" | "SYSTEM", attachmentIds: string[] = [], replyToMessageId?: string) => {
      return sendMessage(content, type, attachmentIds, replyToMessageId);
    },
    [sendMessage],
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
          sendTyping(false);
          onCancelEdit?.();
          return;
        }

        // Handle reply mode or normal send
        await submitPayload(trimmed, "TEXT", [], replyToMessage?.id);
        setText("");
        sendTyping(false);
        onCancelReply?.();
      } catch (submitError) {
        setError(
          submitError instanceof Error
            ? submitError.message
            : "Unable to send the message.",
        );
      }
    },
    [editMessage, editingMessage, onCancelEdit, onCancelReply, replyToMessage?.id, sendTyping, submitPayload, text],
  );

  const handleFilesSelected = useCallback(
    async (files: File[]) => {
      setError(null);

      const uploadIds = files.map(
        (file) => `${conversationId}:${file.name}:${crypto.randomUUID()}`,
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
            uploadIds.forEach((id) =>
              updateUpload(id, { status: "uploading", progress }),
            );
          },
        });

        uploadIds.forEach((id) =>
          updateUpload(id, { status: "registering", progress: 100 }),
        );

        try {
          uploadIds.forEach((id) =>
            updateUpload(id, { status: "sending", progress: 100 }),
          );

          await submitPayload("", "FILE", result.attachments.map((attachment) => attachment.id), replyToMessage?.id);
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

        uploadIds.forEach((id) =>
          updateUpload(id, { status: "done", progress: 100 }),
        );

        window.setTimeout(() => {
          uploadIds.forEach((id) => useUploadStore.getState().removeUpload(id));
        }, 2500);
      } catch (uploadError) {
        const message =
          uploadError instanceof Error
            ? uploadError.message
            : "Unable to upload files.";
        markUploadsError(uploadIds, message);
        setError(message);
      }
    },
    [addUpload, conversationId, fileUpload, markUploadsError, onCancelReply, replyToMessage?.id, submitPayload, updateUpload],
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
            : "Unable to access the microphone.",
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
          voiceError instanceof Error
            ? voiceError.message
            : "Unable to send the voice note.";
      if (uploadId) {
        updateUpload(uploadId, { status: "error", error: message });
      }
      setError(message);
    }
  }, [
    addUpload,
    conversationId,
    onCancelReply,
    replyToMessage?.id,
    submitPayload,
    updateUpload,
    voiceNote,
    voiceUpload,
  ]);

  const helperText = useMemo(() => {
    if (!currentUserId) {
      return "Sign in again if sending stops working.";
    }

    return "Send messages, files, and voice notes in real time.";
  }, [currentUserId]);

  const isEditing = !!editingMessage;
  const isReplying = !!replyToMessage;

  return (
    <div className="border-t border-border bg-card/90 backdrop-blur-xl pb-[max(env(safe-area-inset-bottom),0px)]">
      <UploadProgressList conversationId={conversationId} />

      {/* Reply/Edit context bar */}
      {(isReplying || isEditing) && (
        <div
          className={cn(
            "flex items-center gap-3 border-b border-border px-4 py-2",
            isEditing ? "bg-amber-500/10" : "bg-primary/5"
          )}
        >
          <div
            className={cn(
              "flex size-8 items-center justify-center rounded-full",
              isEditing ? "bg-amber-500/20 text-amber-600" : "bg-primary/20 text-primary"
            )}
          >
            {isEditing ? <Pencil className="size-4" /> : <CornerUpLeft className="size-4" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className={cn("text-xs font-semibold", isEditing ? "text-amber-600" : "text-primary")}>
              {isEditing ? "Editing message" : "Replying to"}
            </p>
            <p className="truncate text-sm text-muted-foreground">
              {getMessagePrimaryText(isEditing ? editingMessage : replyToMessage!) || "Attachment"}
            </p>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8 rounded-full"
                onClick={isEditing ? handleCancelEdit : onCancelReply}
              >
                <X className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">Cancel</TooltipContent>
          </Tooltip>
        </div>
      )}

      <div className="mx-auto w-full max-w-5xl px-3 pb-4 pt-3 lg:px-4">
        <div className="rounded-[30px] border border-border bg-card p-3 shadow-lg">
          <form onSubmit={handleSubmit} className="flex items-end gap-3">
            <div className="flex flex-1 items-end gap-2 rounded-3xl border border-border bg-background px-2 py-2">
              {!isEditing && (
                <>
                  <FileUploadButton
                    onFilesSelected={handleFilesSelected}
                    disabled={isBusy}
                    className="text-muted-foreground"
                  />
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={handleVoiceToggle}
                        disabled={voiceUpload.isPending}
                        className="rounded-2xl text-muted-foreground"
                      >
                        {voiceNote.isRecording ? (
                          <StopCircle className="size-5 text-destructive" />
                        ) : (
                          <Mic className="size-5" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      {voiceNote.isRecording ? "Stop recording" : "Record voice note"}
                    </TooltipContent>
                  </Tooltip>
                </>
              )}
              <Textarea
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
                    ? "Edit your message..."
                    : isReplying
                      ? "Write your reply..."
                      : "Write a message, attach a file, or record a voice note"
                }
                className="min-h-11 border-0 bg-transparent px-1 py-2 shadow-none focus-visible:ring-0"
              />
            </div>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="submit"
                  size="icon-lg"
                  className={cn(
                    "h-12 w-12 rounded-[20px]",
                    isEditing && "bg-amber-500 hover:bg-amber-600"
                  )}
                  disabled={!text.trim() || isBusy}
                >
                  {isBusy ? (
                    <LoaderCircle className="size-4 animate-spin" />
                  ) : isEditing ? (
                    <Pencil className="size-4" />
                  ) : (
                    <Send className="size-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                {isEditing ? "Save edit" : "Send message"}
              </TooltipContent>
            </Tooltip>
          </form>

          <div className="mt-3 flex flex-col gap-2 px-1 sm:flex-row sm:items-center sm:justify-between">
            <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">{helperText}</div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 rounded-full"
                onClick={undoLatest}
              >
                <RotateCcw className="size-3.5" />
                Undo
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 rounded-full"
                onClick={() => {
                  if (lastUndoneCommandId) {
                    redoCommand(lastUndoneCommandId);
                  }
                }}
                disabled={!lastUndoneCommandId}
              >
                <RotateCw className="size-3.5" />
                Redo
              </Button>
              <div className="text-xs text-muted-foreground">
                {voiceNote.isRecording
                  ? "Recording in progress. Tap the stop button to upload."
                  : enterToSend
                    ? "Press Enter to send. Use Shift+Enter for a new line."
                    : "Use the send button to send your message."}
              </div>
            </div>
          </div>

          {error ? <p className="px-1 pt-3 text-sm text-destructive">{error}</p> : null}
        </div>
      </div>
    </div>
  );
}
