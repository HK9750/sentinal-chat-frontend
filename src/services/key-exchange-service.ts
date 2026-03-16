import { apiClient, unwrapData } from '@/services/api-client';
import { API_ROUTES } from '@/lib/constants';
import { getOrCreateClientDeviceId } from '@/lib/device';
import {
  createConversationKeyRecordFromSecret,
  generateDeviceKeyPair,
  openSealedConversationKey,
  sealConversationKey,
} from '@/lib/crypto';
import {
  getConversationKey,
  getStoredDeviceKeyPair,
  saveConversationKey,
  saveStoredDeviceKeyPair,
} from '@/lib/crypto-storage';
import type {
  ConversationDeviceGroup,
  ConversationKeyRecord,
  ConversationKeyShare,
  DeviceKeyBundle,
  ItemsPayload,
  SealedKeyEnvelope,
  ShareConversationKeyItemRequest,
  StoredDeviceKeyPair,
} from '@/types';

async function ensureLocalDeviceKeyPair(): Promise<StoredDeviceKeyPair> {
  const existing = getStoredDeviceKeyPair();

  if (existing) {
    return existing;
  }

  const created = await generateDeviceKeyPair();
  return saveStoredDeviceKeyPair(created);
}

export async function registerCurrentDeviceKeys(): Promise<DeviceKeyBundle> {
  const pair = await ensureLocalDeviceKeyPair();

  return unwrapData<DeviceKeyBundle>(
    apiClient.put(API_ROUTES.devices.myKeys, {
      external_device_id: getOrCreateClientDeviceId(),
      public_key: pair.public_key,
      algorithm: pair.algorithm,
      fingerprint: pair.fingerprint,
    })
  );
}

export async function getConversationDevices(conversationId: string): Promise<ConversationDeviceGroup[]> {
  const payload = await unwrapData<ItemsPayload<ConversationDeviceGroup>>(
    apiClient.get(API_ROUTES.keyExchange.conversationDevices(conversationId))
  );

  return payload.items;
}

export async function shareConversationKey(conversationId: string, record?: ConversationKeyRecord | null): Promise<void> {
  const sourceRecord = record ?? getConversationKey(conversationId);

  if (!sourceRecord) {
    return;
  }

  const localPair = await ensureLocalDeviceKeyPair();
  const deviceGroups = await getConversationDevices(conversationId);
  const shares: ShareConversationKeyItemRequest[] = [];

  for (const group of deviceGroups) {
    for (const device of group.devices) {
      if (device.fingerprint === localPair.fingerprint) {
        continue;
      }

      const sealed = await sealConversationKey(sourceRecord.secret, device);
      shares.push({
        target_device_id: device.device_id,
        target_user_id: group.user_id,
        ciphertext: JSON.stringify(sealed),
        fingerprint: sourceRecord.fingerprint,
        algorithm: sealed.alg,
      });
    }
  }

  if (shares.length === 0) {
    return;
  }

  await unwrapData<ItemsPayload<ConversationKeyShare>>(
    apiClient.post(API_ROUTES.keyExchange.shareConversationKeys(conversationId), { shares })
  );
}

export async function listPendingConversationKeyShares(): Promise<ConversationKeyShare[]> {
  const payload = await unwrapData<ItemsPayload<ConversationKeyShare>>(apiClient.get(API_ROUTES.devices.pendingKeyShares));
  return payload.items;
}

export async function ackConversationKeyShare(shareId: string): Promise<void> {
  await unwrapData(apiClient.post(API_ROUTES.devices.ackKeyShare(shareId)));
}

export async function consumeConversationKeyShare(share: ConversationKeyShare): Promise<ConversationKeyRecord> {
  const pair = await ensureLocalDeviceKeyPair();
  const sealed = JSON.parse(share.ciphertext) as SealedKeyEnvelope;
  const secret = await openSealedConversationKey(sealed, pair);
  const record = await createConversationKeyRecordFromSecret(share.conversation_id, secret, 'synced', share.created_at);
  saveConversationKey(record);
  await ackConversationKeyShare(share.id);
  return record;
}

export async function bootstrapConversationKeySync(): Promise<number> {
  await registerCurrentDeviceKeys();

  const shares = await listPendingConversationKeyShares();

  for (const share of shares) {
    try {
      await consumeConversationKeyShare(share);
    } catch {
      continue;
    }
  }

  return shares.length;
}

export async function ensureConversationKeyShared(conversationId: string, record?: ConversationKeyRecord | null): Promise<void> {
  await registerCurrentDeviceKeys();
  await shareConversationKey(conversationId, record);
}
