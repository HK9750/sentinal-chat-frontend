export interface CipherEnvelope {
  v: 1;
  alg: 'A256GCM';
  iv: string;
  ciphertext: string;
}

export type SecurePayloadKind = 'text' | 'file' | 'audio' | 'system' | 'url';

export interface SecureTextPayload {
  kind: 'text';
  text: string;
}

export interface SecureAssetManifest {
  file_id: string;
  attachment_id?: string;
  filename: string;
  mime_type: string;
  size_bytes: number;
  key: string;
  iv: string;
  checksum?: string;
  duration_ms?: number;
  waveform?: number[];
}

export interface SecureFilePayload {
  kind: 'file';
  caption?: string;
  files: SecureAssetManifest[];
}

export interface SecureAudioPayload {
  kind: 'audio';
  transcript?: string;
  duration_ms?: number;
  clips: SecureAssetManifest[];
}

export interface SecureSystemPayload {
  kind: 'system';
  text: string;
}

export interface SecureUrlPayload {
  kind: 'url';
  url: string;
}

export type SecureMessagePayload =
  | SecureTextPayload
  | SecureFilePayload
  | SecureAudioPayload
  | SecureSystemPayload;

export interface ConversationKeyRecord {
  conversation_id: string;
  secret: string;
  fingerprint: string;
  created_at: string;
  updated_at: string;
  source: 'generated' | 'imported';
}

export interface CryptoVaultState {
  ready: boolean;
  device_fingerprint: string | null;
  stored_keys: number;
}

export interface ConversationAccessCode {
  code: string;
  fingerprint: string;
}

export interface FileEncryptionResult {
  encrypted_bytes: Uint8Array;
  manifest: SecureAssetManifest;
}

export interface VoiceRecordingResult {
  blob: Blob;
  duration_ms: number;
  mime_type: string;
}
