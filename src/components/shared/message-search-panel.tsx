'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Search, X, Loader2, MessageSquare, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { UserAvatar } from '@/components/shared/user-avatar';
import { useSearchMessages } from '@/queries/use-message-queries';
import { useDebounce } from '@/hooks/use-debounce';
import { cn, formatRelativeTime } from '@/lib/utils';
import type { Message } from '@/types';

interface MessageSearchPanelProps {
  conversationId: string;
  isOpen: boolean;
  onClose: () => void;
  onNavigateToMessage: (messageId: string) => void;
}

export function MessageSearchPanel({
  conversationId,
  isOpen,
  onClose,
  onNavigateToMessage,
}: MessageSearchPanelProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const debouncedQuery = useDebounce(query, 300);

  const { data: results, isLoading } = useSearchMessages(
    conversationId,
    debouncedQuery
  );

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [results]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!results?.length) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const selected = results[selectedIndex];
        if (selected) {
          onNavigateToMessage(selected.message.id);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    },
    [results, selectedIndex, onNavigateToMessage, onClose]
  );

  const handleNavigatePrev = useCallback(() => {
    if (!results?.length) return;
    setSelectedIndex((prev) => Math.max(prev - 1, 0));
    const selected = results[Math.max(selectedIndex - 1, 0)];
    if (selected) {
      onNavigateToMessage(selected.message.id);
    }
  }, [results, selectedIndex, onNavigateToMessage]);

  const handleNavigateNext = useCallback(() => {
    if (!results?.length) return;
    setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
    const selected = results[Math.min(selectedIndex + 1, results.length - 1)];
    if (selected) {
      onNavigateToMessage(selected.message.id);
    }
  }, [results, selectedIndex, onNavigateToMessage]);

  if (!isOpen) return null;

  return (
    <div className="absolute top-0 right-0 w-80 h-full bg-background/95 border-l border-border backdrop-blur-xl flex flex-col z-10">
      <div className="p-3 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search in conversation..."
              className="pl-10 pr-10 bg-background border-input text-foreground text-sm"
            />
            {query && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground hover:text-foreground"
                onClick={() => setQuery('')}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {results && results.length > 0 && (
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-muted-foreground">
              {selectedIndex + 1} of {results.length} results
            </span>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleNavigatePrev}
                disabled={selectedIndex === 0}
                className="h-6 w-6 text-muted-foreground hover:text-foreground"
              >
                <ArrowUp className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleNavigateNext}
                disabled={selectedIndex === results.length - 1}
                className="h-6 w-6 text-muted-foreground hover:text-foreground"
              >
                <ArrowDown className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : debouncedQuery.length < 2 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Search className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm">Type to search messages</p>
          </div>
        ) : results?.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <MessageSquare className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm">No messages found</p>
          </div>
        ) : (
          <div className="py-2">
            {results?.map((result, index) => (
              <SearchResultItem
                key={result.message.id}
                message={result.message}
                highlight={result.highlight}
                isSelected={index === selectedIndex}
                onClick={() => {
                  setSelectedIndex(index);
                  onNavigateToMessage(result.message.id);
                }}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

function SearchResultItem({
  message,
  highlight,
  isSelected,
  onClick,
}: {
  message: Message;
  highlight?: string;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full px-3 py-2 text-left transition-colors',
        isSelected
          ? 'bg-primary/20 border-l-2 border-primary'
          : 'hover:bg-muted border-l-2 border-transparent'
      )}
    >
      <div className="flex items-start gap-2">
        {message.sender && (
          <UserAvatar
            user={message.sender}
            size="xs"
            className="shrink-0 mt-0.5"
          />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-foreground truncate">
              {message.sender?.display_name || 'Unknown'}
            </span>
            <span className="text-xs text-muted-foreground shrink-0">
              {formatRelativeTime(message.created_at)}
            </span>
          </div>
          <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">
            {highlight ? (
              <span
                dangerouslySetInnerHTML={{
                  __html: highlight,
                }}
              />
            ) : (
              message.content || message.ciphertext || '[Encrypted]'
            )}
          </p>
        </div>
      </div>
    </button>
  );
}
