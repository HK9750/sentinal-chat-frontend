"use client";

import { useMemo } from "react";
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
  const allItems = useUploadStore((state) => state.items);
  const removeUpload = useUploadStore((state) => state.removeUpload);
  const items = useMemo(
    () => allItems.filter((item) => item.conversation_id === conversationId),
    [allItems, conversationId],
  );

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="border-t border-border px-4 py-3">
      <div className="flex flex-wrap gap-2">
      {items.map((item) => {
        const isComplete = item.status === "done";
        const isFailed = item.status === "error";

        return (
          <div
            key={item.id}
            className={cn(
              "flex min-w-55 flex-1 items-center gap-3 rounded-[22px] border px-3 py-2.5 text-sm shadow-sm",
              isComplete
                ? "border-primary/20 bg-primary/10"
                : isFailed
                  ? "border-destructive/20 bg-destructive/10"
                  : "border-border bg-card",
            )}
          >
            {isComplete ? (
              <CheckCircle2 className="size-4 text-primary" />
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
                      : item.status === "sending"
                        ? "Sending message"
                      : item.status === "done"
                        ? "Sent securely"
                        : (item.error ?? "Upload failed")}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon-xs"
              className="rounded-full"
              onClick={() => removeUpload(item.id)}
              aria-label={`Remove ${item.filename} upload status`}
            >
              <X className="size-3.5" />
            </Button>
          </div>
        );
      })}
      </div>
    </div>
  );
}
