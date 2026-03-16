'use client';

import { useMemo, useState } from 'react';
import { ArrowRight, RadioTower, Search } from 'lucide-react';
import { BroadcastDetail } from './broadcast-detail';
import { SearchInput } from '@/components/shared/search-input';
import { Badge } from '@/components/ui/badge';
import { useBroadcastDetail, useBroadcasts } from '@/queries/use-broadcast-queries';
import { cn } from '@/lib/utils';

export function BroadcastList() {
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const broadcastsQuery = useBroadcasts();

  const filteredBroadcasts = useMemo(() => {
    const broadcasts = broadcastsQuery.data ?? [];
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return broadcasts;
    }

    return broadcasts.filter((broadcast) => {
      return [broadcast.title, broadcast.description, broadcast.audience, broadcast.status]
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery);
    });
  }, [broadcastsQuery.data, query]);

  const activeBroadcastId = selectedId ?? filteredBroadcasts[0]?.id ?? broadcastsQuery.data?.[0]?.id ?? null;

  const detailQuery = useBroadcastDetail(activeBroadcastId);
  const selectedBroadcast = detailQuery.data ?? null;

  return (
    <div className="grid min-h-[calc(100vh-2rem)] lg:grid-cols-[320px_minmax(0,1fr)]">
      <aside className="border-b border-border/70 lg:border-b-0 lg:border-r">
        <div className="border-b border-border/70 px-4 py-4">
          <p className="section-kicker">Broadcasts</p>
          <div className="mt-1 flex items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold tracking-[-0.04em]">Planning surface</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Backend transport is missing, so this area stays intentionally read-only.
              </p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-background/60 p-2 text-primary">
              <RadioTower className="size-4" />
            </div>
          </div>

          <div className="mt-4">
            <SearchInput value={query} onChange={setQuery} placeholder="Search placeholder broadcasts" />
          </div>
        </div>

        <div className="border-b border-border/70 px-4 py-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Search className="size-3.5" />
            This list documents unavailable functionality instead of live campaigns.
          </div>
        </div>

        <div className="space-y-2 px-2 py-2">
          {broadcastsQuery.isLoading ? (
            <div className="px-4 py-10 text-sm text-muted-foreground">Loading broadcast notes...</div>
          ) : filteredBroadcasts.length === 0 ? (
            <div className="px-4 py-10 text-sm text-muted-foreground">No broadcast placeholders match that search.</div>
          ) : (
            filteredBroadcasts.map((broadcast) => {
              const isSelected = broadcast.id === activeBroadcastId;

              return (
                <button
                  key={broadcast.id}
                  type="button"
                  onClick={() => setSelectedId(broadcast.id)}
                    className={cn(
                      'flex w-full flex-col gap-3 rounded-[22px] border px-4 py-4 text-left transition-colors',
                      isSelected
                        ? 'border-primary/40 bg-primary/8 shadow-sm'
                        : 'border-border/70 bg-background/45 hover:bg-background/70'
                    )}
                  >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium">{broadcast.title}</p>
                    <Badge variant="secondary" className="capitalize">
                      {broadcast.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{broadcast.description}</p>
                  <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span>Audience: {broadcast.audience}</span>
                    <ArrowRight className="size-3.5" />
                  </div>
                </button>
              );
            })
          )}
        </div>
      </aside>

      <BroadcastDetail broadcast={selectedBroadcast} isLoading={detailQuery.isLoading && !selectedBroadcast} />
    </div>
  );
}
