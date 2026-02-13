export interface IdentityKey {
  id: string;
  user_id: string;
  device_id: string;
  public_key: string;
  created_at: string;
  is_active: boolean;
}

export interface SignedPreKey {
  id: string;
  user_id: string;
  device_id: string;
  key_id: number;
  public_key: string;
  signature: string;
  created_at: string;
  is_active: boolean;
}

export interface OneTimePreKey {
  id: string;
  user_id: string;
  device_id: string;
  key_id: number;
  public_key: string;
  created_at: string;
  consumed_by?: string;
  consumed_device_id?: string;
  consumed_at?: string;
}

export interface KeyBundle {
  identity_key: IdentityKey;
  signed_pre_key: SignedPreKey;
  one_time_pre_key?: OneTimePreKey;
}
