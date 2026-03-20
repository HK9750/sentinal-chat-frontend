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

export function createClientMessageId(): string {
  return `msg-${crypto.randomUUID()}`;
}
