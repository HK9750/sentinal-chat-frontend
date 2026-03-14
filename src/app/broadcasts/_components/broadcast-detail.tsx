'use client';

import { AlertTriangle, CheckCircle2, RadioTower, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import type { BroadcastDetail as BroadcastDetailType } from '@/types';

interface BroadcastDetailProps {
  broadcast: BroadcastDetailType | null;
  isLoading?: boolean;
}

export function BroadcastDetail({ broadcast, isLoading = false }: BroadcastDetailProps) {
  if (isLoading) {
    return (
      <section className="flex min-h-[calc(100vh-2rem)] items-center justify-center px-6 py-10">
        <p className="text-sm text-muted-foreground">Loading broadcast context...</p>
      </section>
    );
  }

  if (!broadcast) {
    return (
      <section className="flex min-h-[calc(100vh-2rem)] items-center justify-center px-6 py-10">
        <p className="text-sm text-muted-foreground">Select a broadcast note to inspect its current status.</p>
      </section>
    );
  }

  return (
    <section className="flex min-h-[calc(100vh-2rem)] flex-col">
      <div className="border-b border-border/70 px-6 py-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="section-kicker">Broadcast detail</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-[-0.04em]">{broadcast.title}</h2>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{broadcast.description}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="capitalize">
              {broadcast.status}
            </Badge>
            <Badge variant="outline">{broadcast.audience}</Badge>
          </div>
        </div>
      </div>

      <div className="grid flex-1 gap-4 px-6 py-6 xl:grid-cols-[minmax(0,1.4fr)_320px]">
        <Card className="surface-panel rounded-[26px] border-border/70 p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-primary/10 p-2 text-primary">
              <RadioTower className="size-4" />
            </div>
            <div>
              <h3 className="font-semibold">Why this page exists</h3>
              <p className="text-sm text-muted-foreground">
                The frontend keeps the route visible, but avoids fake create, edit, or recipient flows until backend support is real.
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {broadcast.notes.map((note) => (
              <div key={note} className="rounded-[20px] border border-border/70 bg-background/60 px-4 py-3 text-sm text-muted-foreground">
                {note}
              </div>
            ))}
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="surface-panel rounded-[26px] border-border/70 p-5">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 size-4 text-primary" />
              <div>
                <h3 className="font-semibold">Current recommendation</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Use direct conversations or group threads for production messaging until broadcast APIs land.
                </p>
              </div>
            </div>
          </Card>

          <Card className="surface-panel rounded-[26px] border-border/70 p-5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 size-4 text-amber-500" />
              <div>
                <h3 className="font-semibold">What is intentionally missing</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Recipient management, composer flows, analytics, and delivery actions stay disabled to avoid drifting away from the backend contract.
                </p>
              </div>
            </div>
          </Card>

          <Card className="surface-panel rounded-[26px] border-border/70 p-5">
            <div className="flex items-start gap-3">
              <Sparkles className="mt-0.5 size-4 text-primary" />
              <div>
                <h3 className="font-semibold">Next rewrite target</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  When backend routes exist, this section can evolve into encrypted broadcast drafting with audited recipient selection.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}
