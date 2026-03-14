'use client';

import { MessageSquareDashed, ShieldCheck } from 'lucide-react';
import { APP_LIMITATIONS } from '@/lib/constants';

export function ChatEmptyState() {
  return (
    <div className="flex flex-1 items-center justify-center bg-[#efeae2] bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.55),transparent_55%)] p-6">
      <div className="max-w-xl rounded-[28px] border border-border/60 bg-background/88 px-8 py-10 text-center shadow-[0_24px_80px_-32px_rgba(18,46,55,0.18)]">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
          <MessageSquareDashed className="size-8" />
        </div>
        <p className="section-kicker">Sentinel Web</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-[-0.05em]">Keep your secure chats in sync</h2>
        <p className="mt-3 text-sm text-muted-foreground">
          Select a conversation from the sidebar or start a new chat to exchange encrypted messages, files, and voice notes.
        </p>
        <div className="mt-6 rounded-2xl border border-border/70 bg-background/55 px-4 py-4 text-left">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 size-4 text-primary" />
            <p className="text-sm text-muted-foreground">{APP_LIMITATIONS.keySync}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
