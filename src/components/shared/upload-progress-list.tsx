"use client";

import { CheckCircle2, LoaderCircle, TriangleAlert, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUploadStore } from "@/stores/upload-store";
import { cn } from "@/lib/utils";

interface UploadProgressListProps {
  conversationId: string;
}

export function UploadProgressList({
  conversationId,
}: UploadProgressListProps) {
  const items = useUploadStore((state) =>
    state.items.filter((item) => item.conversation_id === conversationId),
  );
  const removeUpload = useUploadStore((state) => state.removeUpload);

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2 border-t border-white/10 px-4 py-3">
      {items.map((item) => {
        const isComplete = item.status === "done";
        const isFailed = item.status === "error";

        return (
          <div
            key={item.id}
            className={cn(
              "flex min-w-55 flex-1 items-center gap-3 rounded-2xl border px-3 py-2 text-sm",
              isComplete
                ? "border-emerald-500/30 bg-emerald-500/10"
                : isFailed
                  ? "border-destructive/30 bg-destructive/10"
                  : "border-white/10 bg-background/40",
            )}
          >
            {isComplete ? (
              <CheckCircle2 className="size-4 text-emerald-500" />
            ) : isFailed ? (
              <TriangleAlert className="size-4 text-destructive" />
            ) : (
              <LoaderCircle className="size-4 animate-spin text-primary" />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{item.filename}</p>
              <p className="text-xs text-muted-foreground">
                {item.status === "encrypting"
                  ? "Encrypting on device"
                  : item.status === "uploading"
                    ? `${item.progress}% uploaded`
                    : item.status === "registering"
                      ? "Registering attachment"
                      : item.status === "done"
                        ? "Ready to send"
                        : (item.error ?? "Upload failed")}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => removeUpload(item.id)}
              aria-label={`Remove ${item.filename} upload status`}
            >
              <X className="size-3.5" />
            </Button>
          </div>
        );
      })}
    </div>
  );
}
