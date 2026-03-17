import { clsx, type ClassValue } from 'clsx';
import { formatDistanceToNowStrict, isToday, isYesterday } from 'date-fns';
import { twMerge } from 'tailwind-merge';
import type { Conversation, ConversationMessageSummary, Message, Participant } from '@/types';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function formatTimestamp(value?: string | Date | null): string {
  if (!value) {
    return '';
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

export function formatCalendarLabel(value?: string | Date | null): string {
  if (!value) {
    return 'Unknown';
  }

  const date = value instanceof Date ? value : new Date(value);

  if (isToday(date)) {
    return 'Today';
  }

  if (isYesterday(date)) {
    return 'Yesterday';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(date);
}

export function formatRelativeTime(value?: string | Date | null): string {
  if (!value) {
    return 'just now';
  }

  const date = value instanceof Date ? value : new Date(value);
  return formatDistanceToNowStrict(date, { addSuffix: true });
}

export function formatBytes(value: number): string {
  if (value < 1024) {
    return `${value} B`;
  }

  const units = ['KB', 'MB', 'GB', 'TB'];
  let size = value / 1024;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${size.toFixed(size >= 10 ? 0 : 1)} ${units[unitIndex]}`;
}

export function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function getOtherParticipant(conversation: Conversation, currentUserId?: string | null): Participant | null {
  if (conversation.type !== 'DM') {
    return null;
  }

  return conversation.participants.find((participant) => participant.user_id !== currentUserId) ?? null;
}

export function getConversationTitle(conversation: Conversation, currentUserId?: string | null): string {
  if (conversation.subject?.trim()) {
    return conversation.subject;
  }

  if (conversation.type === 'DM') {
    return getOtherParticipant(conversation, currentUserId)?.display_name ?? 'Direct message';
  }

  return conversation.participants.map((participant) => participant.display_name).slice(0, 3).join(', ');
}

export function getConversationSubtitle(conversation: Conversation, currentUserId?: string | null): string {
  if (conversation.description?.trim()) {
    return conversation.description;
  }

	if (conversation.type === 'DM') {
		const otherParticipant = getOtherParticipant(conversation, currentUserId);

		if (!otherParticipant) {
			return 'Direct message';
		}

    return otherParticipant.is_online ? 'Online now' : `@${otherParticipant.username || 'member'}`;
  }

  return `${conversation.participants.length} participants`;
}

export function getConversationAvatar(conversation: Conversation, currentUserId?: string | null): string | null {
  if (conversation.avatar_url) {
    return conversation.avatar_url;
  }

  return getOtherParticipant(conversation, currentUserId)?.avatar_url ?? null;
}

export function getMessagePreview(message?: Message | ConversationMessageSummary | null): string {
  if (!message) {
    return 'No messages yet';
  }

  if (message.deleted_at) {
    return 'Message removed';
  }

	const kind = 'type' in message ? message.type : message.kind;

	if (kind === 'AUDIO') {
		return 'Voice note';
	}

	if (kind === 'FILE') {
		if ('attachments' in message) {
			return `${message.attachments.length || 1} file${message.attachments.length === 1 ? '' : 's'}`;
		}

		return 'File';
	}

	if (kind === 'POLL') {
		return 'Poll';
	}

	if ('content' in message) {
		return message.content ? message.content : 'Empty message';
	}

	return 'Message';
}

export function groupMessagesByDay(messages: Message[]): Array<{ label: string; items: Message[] }> {
  const buckets = new Map<string, Message[]>();

  for (const message of messages) {
    const label = formatCalendarLabel(message.created_at);
    const bucket = buckets.get(label) ?? [];
    bucket.push(message);
    buckets.set(label, bucket);
  }

  return Array.from(buckets.entries()).map(([label, items]) => ({ label, items }));
}

export function uniqueById<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  const result: T[] = [];

  for (const item of items) {
    if (seen.has(item.id)) {
      continue;
    }

    seen.add(item.id);
    result.push(item);
  }

  return result;
}

export function toErrorMessage(error: unknown, fallback = 'Something went wrong.'): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === 'string' && error.trim()) {
    return error;
  }

  return fallback;
}

export function sleep(duration: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, duration);
  });
}

export function isImageMimeType(mimeType: string): boolean {
  return mimeType.startsWith('image/');
}

export function isAudioMimeType(mimeType: string): boolean {
  return mimeType.startsWith('audio/');
}

export function isVideoMimeType(mimeType: string): boolean {
  return mimeType.startsWith('video/');
}
