export function createRequestId(prefix = "req"): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

export function createMessageRequestId(
  action: "send",
  conversationId: string,
  clientMessageId: string,
): string {
  return createRequestId(`${action}:${conversationId}:${clientMessageId}`);
}

export function createCommandRequestId(
  action: 'undo' | 'redo',
  conversationId?: string,
): string {
  if (!conversationId) {
    return createRequestId(`cmd:${action}`);
  }
  return createRequestId(`cmd:${action}:${conversationId}`);
}

export function parseMessageRequestId(requestId?: string | null): {
  action: string;
  conversationId: string;
  clientMessageId: string;
} | null {
  if (!requestId) {
    return null;
  }

  const separatorIndex = requestId.lastIndexOf("_");
  const prefix = separatorIndex >= 0 ? requestId.slice(0, separatorIndex) : requestId;
  const [action, conversationId, ...clientMessageParts] = prefix.split(":");
  const clientMessageId = clientMessageParts.join(":");

  if (!action || !conversationId || !clientMessageId) {
    return null;
  }

  return { action, conversationId, clientMessageId };
}

export function parseCommandRequestId(requestId?: string | null): {
  action: 'undo' | 'redo';
  conversationId?: string;
} | null {
  if (!requestId) {
    return null;
  }

  const separatorIndex = requestId.lastIndexOf('_');
  const prefix = separatorIndex >= 0 ? requestId.slice(0, separatorIndex) : requestId;
  const [kind, action, ...conversationParts] = prefix.split(':');
  if (kind !== 'cmd' || (action !== 'undo' && action !== 'redo')) {
    return null;
  }

  const conversationId = conversationParts.join(':').trim();
  return conversationId ? { action, conversationId } : { action };
}

export function createClientMessageId(): string {
  return `msg-${crypto.randomUUID()}`;
}
