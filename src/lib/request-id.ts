export function createRequestId(prefix = 'req'): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

export function createMessageRequestId(action: 'send', conversationId: string, clientMessageId: string): string {
  return createRequestId(`${action}:${conversationId}:${clientMessageId}`);
}

export function parseMessageRequestId(requestId?: string | null): {
  action: string;
  conversationId: string;
  clientMessageId: string;
} | null {
  if (!requestId) {
    return null;
  }

  const prefix = requestId.split('_', 1)[0] ?? '';
  const [action, conversationId, clientMessageId] = prefix.split(':');

  if (!action || !conversationId || !clientMessageId) {
    return null;
  }

  return { action, conversationId, clientMessageId };
}

export function createClientMessageId(): string {
  return `msg_${crypto.randomUUID()}`;
}
