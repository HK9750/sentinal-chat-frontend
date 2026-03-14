'use client';

import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useDecryptedMessages } from '@/hooks/use-decrypted-messages';
import { getMessageSearchText, getMessagePrimaryText } from '@/lib/message-payload';
import { formatRelativeTime } from '@/lib/utils';

interface MessageSearchPanelProps {
  conversationId: string;
  isOpen: boolean;
  onClose: () => void;
  onNavigateToMessage: (messageId: string) => void;
}

export function MessageSearchPanel({ conversationId, isOpen, onClose, onNavigateToMessage }: MessageSearchPanelProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const messages = useDecryptedMessages(conversationId);
  const debouncedQuery = useDebouncedValue(query, 180);

  const results = useMemo(() => {
    const normalized = debouncedQuery.trim().toLowerCase();

    if (!normalized) {
      return [];
    }

    return messages.items.filter((item) => getMessageSearchText(item.decrypted).includes(normalized));
  }, [debouncedQuery, messages.items]);

  const clampedSelectedIndex = results.length === 0 ? 0 : Math.min(selectedIndex, results.length - 1);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="absolute inset-y-0 right-0 z-20 flex w-full max-w-sm flex-col border-l border-border/70 bg-[#f8fafb]/96 backdrop-blur-xl">
      <div className="border-b border-border/70 bg-[#f0f2f5] p-4">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setSelectedIndex(0);
              }}
              placeholder="Search this chat"
              className="h-11 rounded-full border-border/70 bg-background pl-10 pr-10 shadow-none"
            />
            {query ? (
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                className="absolute right-3 top-1/2 -translate-y-1/2"
                onClick={() => {
                  setQuery('');
                  setSelectedIndex(0);
                }}
              >
                <X className="size-3.5" />
              </Button>
            ) : null}
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </div>

        {results.length > 0 ? (
          <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {clampedSelectedIndex + 1} of {results.length}
            </span>
            <div className="flex gap-1">
              <Button
                type="button"
                variant="outline"
                size="icon-xs"
                disabled={clampedSelectedIndex === 0}
                onClick={() => {
                  const nextIndex = Math.max(clampedSelectedIndex - 1, 0);
                  setSelectedIndex(nextIndex);
                  onNavigateToMessage(results[nextIndex].message.id);
                }}
              >
                <ArrowUp className="size-3.5" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon-xs"
                disabled={clampedSelectedIndex === results.length - 1}
                onClick={() => {
                  const nextIndex = Math.min(clampedSelectedIndex + 1, results.length - 1);
                  setSelectedIndex(nextIndex);
                  onNavigateToMessage(results[nextIndex].message.id);
                }}
              >
                <ArrowDown className="size-3.5" />
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      <ScrollArea className="flex-1 p-2">
        {query.trim().length < 2 ? (
          <div className="px-4 py-10 text-center text-sm text-muted-foreground">
            Type at least two characters to search the messages that are already loaded on this device.
          </div>
        ) : results.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-muted-foreground">No matches in the currently loaded message history.</div>
        ) : (
          <div className="space-y-2">
            {results.map((result, index) => (
              <button
                key={result.message.id}
                type="button"
                onClick={() => {
                  setSelectedIndex(index);
                  onNavigateToMessage(result.message.id);
                }}
                className={`w-full rounded-[18px] border px-3 py-3 text-left transition-colors ${
                  index === clampedSelectedIndex ? 'border-primary/35 bg-primary/8' : 'border-border/60 bg-background/80 hover:bg-background'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">{getMessagePrimaryText(result.decrypted)}</p>
                  <span className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                    {formatRelativeTime(result.message.created_at)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
