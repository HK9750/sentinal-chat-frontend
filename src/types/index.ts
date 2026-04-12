export * from '@/types/call';
export * from '@/types/conversation';
export * from '@/types/message';
export * from '@/types/notification';
export * from '@/types/upload';
export * from '@/types/user';

export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  error?: string;
  code?: string;
}

export interface ItemsPayload<T> {
  items: T[];
}

export interface ListPayload<T> {
  items: T[];
  total: number;
}

export interface SocketEnvelope<T = unknown> {
  type: string;
  request_id?: string;
  user_id?: string;
  device_id?: string;
  conversation_id?: string;
  call_id?: string;
  source?: string;
  sent_at: string;
  data?: T;
}

export interface ConnectionReadyPayload {
  user_id: string;
  session_id: string;
  device_id: string;
}

export interface ClientSocketFrame<T = unknown> {
  type: string;
  request_id?: string;
  conversation_id?: string;
  call_id?: string;
  data?: T;
}
