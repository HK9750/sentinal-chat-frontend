import type { DecryptedMessageState, SecureAssetManifest, SecureMessagePayload } from '@/types';

function summarizePayload(payload: SecureMessagePayload): string {
  switch (payload.kind) {
    case 'text':
      return payload.text;
    case 'system':
      return payload.text;
    case 'file': {
      const names = payload.files.map((file) => file.filename).filter(Boolean);
      return [payload.caption ?? '', ...names].join(' ').trim() || 'Encrypted file';
    }
    case 'audio': {
      const names = payload.clips.map((clip) => clip.filename).filter(Boolean);
      return [payload.transcript ?? '', ...names, 'voice note'].join(' ').trim();
    }
    default:
      return 'Encrypted message';
  }
}

export function getMessageSearchText(state: DecryptedMessageState): string {
  if (state.status !== 'ready' || !state.payload) {
    return '';
  }

  return summarizePayload(state.payload).toLowerCase();
}

export function getMessagePrimaryText(state: DecryptedMessageState): string {
  if (state.status === 'missing-key') {
    return state.error ?? 'Conversation key missing on this device.';
  }

  if (state.status === 'error') {
    return state.error ?? 'Unable to decrypt this message.';
  }

  if (state.status !== 'ready' || !state.payload) {
    return 'Encrypted message';
  }

  return summarizePayload(state.payload) || 'Encrypted message';
}

export function getMessageAssetManifests(payload?: SecureMessagePayload): SecureAssetManifest[] {
  if (!payload) {
    return [];
  }

  if (payload.kind === 'file') {
    return payload.files;
  }

  if (payload.kind === 'audio') {
    return payload.clips;
  }

  return [];
}

export function isRenderableTextPayload(payload?: SecureMessagePayload): boolean {
  return payload?.kind === 'text' || payload?.kind === 'system';
}
