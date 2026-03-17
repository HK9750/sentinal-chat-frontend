import type { Message } from '@/types';

export function getMessageSearchText(message: Message): string {
  const text = message.content?.trim();

  if (text) {
    return text.toLowerCase();
  }

  const names = message.attachments.map((attachment) => attachment.filename).filter(Boolean);
  return names.join(' ').toLowerCase();
}

export function getMessagePrimaryText(message: Message): string {
  if (message.deleted_at) {
    return 'This message was removed.';
  }

  const text = message.content?.trim();

  if (text) {
    return text;
  }

  if (message.type === 'AUDIO') {
    return 'Voice note';
  }

  if (message.type === 'FILE') {
    return message.attachments[0]?.filename ?? 'File attachment';
  }

  if (message.type === 'POLL') {
    return message.poll?.question ?? 'Poll';
  }

  return 'Message';
}
