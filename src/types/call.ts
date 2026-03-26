export type CallType = "AUDIO" | "VIDEO";
export type CallStatus =
  | "idle"
  | "incoming"
  | "outgoing"
  | "connecting"
  | "connected"
  | "ended"
  | "failed";

export interface IncomingCall {
  call_id: string;
  conversation_id: string;
  initiated_by: string;
  type: CallType;
  started_at?: string;
  participant_ids?: string[];
}

export interface ActiveCall {
  call_id: string;
  conversation_id: string;
  type: CallType;
  peer_user_id?: string;
  initiator_id?: string;
  status: CallStatus;
  started_at?: string;
  connected_at?: string;
  ended_reason?: string;
  participant_ids?: string[];
}

export interface CallSignalPayload {
  to_user_id: string;
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
}

export interface ServerCallSignalPayload {
  from_user_id: string;
  payload: Record<string, unknown>;
}
