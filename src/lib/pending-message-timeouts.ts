interface PendingMessageTimeoutInput {
  conversationId: string;
  clientMessageId: string;
  timeoutMs: number;
  onTimeout: () => void;
}

const timeoutByKey = new Map<string, number>();

function buildKey(conversationId: string, clientMessageId: string): string {
  return `${conversationId}:${clientMessageId}`;
}

export function schedulePendingMessageTimeout({
  conversationId,
  clientMessageId,
  timeoutMs,
  onTimeout,
}: PendingMessageTimeoutInput): void {
  const key = buildKey(conversationId, clientMessageId);
  const existing = timeoutByKey.get(key);

  if (typeof existing === 'number') {
    window.clearTimeout(existing);
  }

  const timeoutId = window.setTimeout(() => {
    timeoutByKey.delete(key);
    onTimeout();
  }, timeoutMs);

  timeoutByKey.set(key, timeoutId);
}

export function clearPendingMessageTimeout(conversationId: string, clientMessageId: string): void {
  const key = buildKey(conversationId, clientMessageId);
  const timeoutId = timeoutByKey.get(key);

  if (typeof timeoutId !== 'number') {
    return;
  }

  window.clearTimeout(timeoutId);
  timeoutByKey.delete(key);
}

export function clearAllPendingMessageTimeouts(): void {
  for (const timeoutId of timeoutByKey.values()) {
    window.clearTimeout(timeoutId);
  }

  timeoutByKey.clear();
}
