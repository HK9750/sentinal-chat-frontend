export interface CipherEnvelope {
  v: 1;
  alg: 'A256GCM';
  iv: string;
  ciphertext: string;
}

export interface SealedKeyEnvelope {
  v: 1;
  alg: string;
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
  source: 'generated' | 'imported' | 'synced';
}

export interface StoredDeviceKeyPair {
  algorithm: string;
  fingerprint: string;
  public_key: string;
  private_key: string;
  created_at: string;
  updated_at: string;
}

export interface DeviceKeyBundle {
  device_id: string;
  external_device_id: string;
  device_name?: string | null;
  device_type?: string | null;
  public_key: string;
  algorithm: string;
  fingerprint: string;
}

export interface ConversationDeviceGroup {
  user_id: string;
  display_name: string;
  devices: DeviceKeyBundle[];
}

export interface ConversationKeyShare {
  id: string;
  conversation_id: string;
  target_device_id: string;
  target_user_id: string;
  sender_device_id?: string | null;
  fingerprint: string;
  algorithm: string;
  ciphertext: string;
  created_at: string;
  delivered_at?: string | null;
  acked_at?: string | null;
}

export interface ShareConversationKeyItemRequest {
  target_device_id: string;
  target_user_id: string;
  ciphertext: string;
  fingerprint: string;
  algorithm?: string;
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
