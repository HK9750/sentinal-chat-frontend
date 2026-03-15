import {
  clearConversationKeys,
  getConversationKey,
  importConversationAccessCode,
  listConversationKeys,
  requireConversationKeyRecord,
  saveConversationKey,
} from '@/lib/crypto-storage';
import {
  createConversationAccessCode,
  createVaultBackupPayload,
  decryptBinaryAsset,
  decryptPayload,
  decryptRemoteUrl,
  encryptBinaryAsset,
  encryptPayload,
  encryptRemoteUrl,
  parseVaultBackupPayload,
} from '@/lib/crypto';
import { toErrorMessage } from '@/lib/utils';
import {
  createAttachment,
  downloadEncryptedAttachment,
  markAttachmentViewed,
  uploadEncryptedBlob,
} from '@/services/upload-service';
import type {
  Attachment,
  ConversationKeyRecord,
  DecryptedMessageState,
  Message,
  SecureAssetManifest,
  SecureMessagePayload,
  VoiceRecordingResult,
} from '@/types';

function toBlobPart(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

async function requireConversationKey(conversationId: string): Promise<ConversationKeyRecord> {
  return requireConversationKeyRecord(conversationId);
}

export function hasConversationKey(conversationId: string): boolean {
  return Boolean(getConversationKey(conversationId));
}

export async function exportConversationAccess(conversationId: string) {
  const record = await requireConversationKey(conversationId);
  return createConversationAccessCode(record);
}

export async function importConversationAccess(code: string) {
  return importConversationAccessCode(code);
}

export function exportVaultBackup(): string {
  return createVaultBackupPayload(listConversationKeys());
}

export function importVaultBackup(payload: string): number {
  const records = parseVaultBackupPayload(payload);

  for (const record of records) {
    saveConversationKey(record);
  }

  return records.length;
}

export function clearVault(): void {
  clearConversationKeys();
}

export async function encryptConversationPayload(
  conversationId: string,
  payload: SecureMessagePayload
): Promise<string> {
  const record = await requireConversationKey(conversationId);
  return encryptPayload(payload, record.secret);
}

export async function decryptConversationPayload(
  conversationId: string,
  message: Pick<Message, 'conversation_id' | 'encrypted_content' | 'deleted_at'>
): Promise<DecryptedMessageState> {
  if (message.deleted_at) {
    return {
      status: 'ready',
      payload: { kind: 'system', text: 'This message was removed.' },
    };
  }

  if (!message.encrypted_content) {
    return { status: 'empty' };
  }

  const record = getConversationKey(conversationId);

  if (!record) {
    return {
      status: 'missing-key',
      error: 'This device does not have the conversation key yet.',
    };
  }

  try {
    const payload = await decryptPayload<SecureMessagePayload>(message.encrypted_content, record.secret);
    return { status: 'ready', payload };
  } catch (error) {
    return {
      status: 'error',
      error: toErrorMessage(error, 'Unable to decrypt this message.'),
    };
  }
}

async function registerEncryptedAsset(
  conversationId: string,
  file: Blob,
  filename: string,
  mimeType: string,
  overrides?: Partial<SecureAssetManifest>,
  onProgress?: (progress: number) => void
): Promise<{ attachment: Attachment; manifest: SecureAssetManifest }> {
  const record = await requireConversationKey(conversationId);
  const encrypted = await encryptBinaryAsset(file, filename, mimeType, overrides);
  const encryptedBlob = new Blob([toBlobPart(encrypted.encrypted_bytes)], { type: 'application/octet-stream' });
  const uploaded = await uploadEncryptedBlob(encryptedBlob, `${filename}.enc`, onProgress);

  if (!uploaded.file_url) {
    throw new Error('Upload did not return a file URL.');
  }

  const attachment = await createAttachment({
    file_url: await encryptRemoteUrl(uploaded.file_url, record.secret),
    filename,
    mime_type: mimeType || 'application/octet-stream',
    size_bytes: file.size,
    duration_seconds: overrides?.duration_ms ? Math.ceil(overrides.duration_ms / 1000) : undefined,
  });

  return {
    attachment,
    manifest: {
      ...encrypted.manifest,
      attachment_id: attachment.id,
    },
  };
}

export async function prepareEncryptedFiles(
  conversationId: string,
  files: File[],
  onProgress?: (progress: number) => void
): Promise<{ attachments: Attachment[]; manifests: SecureAssetManifest[] }> {
  const attachments: Attachment[] = [];
  const manifests: SecureAssetManifest[] = [];

  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    const { attachment, manifest } = await registerEncryptedAsset(
      conversationId,
      file,
      file.name,
      file.type || 'application/octet-stream',
      undefined,
      (progress) => {
        const itemProgress = Math.round((index / files.length) * 100 + progress / files.length);
        onProgress?.(itemProgress);
      }
    );

    attachments.push(attachment);
    manifests.push(manifest);
  }

  onProgress?.(100);

  return { attachments, manifests };
}

export async function prepareEncryptedVoiceNote(
  conversationId: string,
  recording: VoiceRecordingResult,
  onProgress?: (progress: number) => void
): Promise<{ attachment: Attachment; manifest: SecureAssetManifest }> {
  return registerEncryptedAsset(
    conversationId,
    recording.blob,
    `voice-note-${Date.now()}.webm`,
    recording.mime_type,
    { duration_ms: recording.duration_ms },
    onProgress
  );
}

export async function openEncryptedAttachment(
  conversationId: string,
  attachment: Attachment,
  manifest: SecureAssetManifest
): Promise<Blob> {
  const record = getConversationKey(conversationId);

  if (!record) {
    throw new Error('This device does not have the conversation key yet.');
  }

  const fileUrl = await decryptRemoteUrl(attachment.encrypted_url, record.secret);
  const encryptedBlob = await downloadEncryptedAttachment(fileUrl);
  const decryptedBlob = await decryptBinaryAsset(encryptedBlob, manifest);

  if (attachment.view_once && !attachment.viewed_at) {
    await markAttachmentViewed(attachment.id).catch(() => undefined);
  }

  return decryptedBlob;
}
