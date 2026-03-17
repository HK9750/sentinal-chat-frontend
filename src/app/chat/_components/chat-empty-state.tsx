'use client';

import { Compass, MessageSquareDashed } from 'lucide-react';

export function ChatEmptyState() {
  return (
    <div className="flex flex-1 items-center justify-center bg-background p-6 lg:p-10">
      <div className="grid w-full max-w-4xl gap-5 rounded-[34px] border border-border bg-card px-8 py-8 shadow-2xl lg:grid-cols-[1.2fr_0.8fr] lg:px-10 lg:py-10">
        <div>
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary lg:mx-0">
          <MessageSquareDashed className="size-8" />
          </div>
          <p className="section-kicker text-center lg:text-left">Sentinel Web</p>
          <h2 className="mt-2 text-center text-3xl font-semibold tracking-[-0.05em] lg:text-left lg:text-4xl">Pick a thread or open a new chat</h2>
          <p className="mt-3 text-center text-sm leading-6 text-muted-foreground lg:text-left">
            The chat workspace is ready. Choose a conversation from the left or start a direct message or group to exchange messages, files, and voice notes.
          </p>
        </div>

        <div className="space-y-3 rounded-[28px] border border-border bg-muted/30 p-5 text-left">
          <div className="flex items-start gap-3 rounded-[22px] border border-border bg-background px-4 py-4">
            <Compass className="mt-0.5 size-4 text-primary" />
            <p className="text-sm text-muted-foreground">Use search to jump between threads fast, then search inside any thread from the header.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
