export type CallType = 'AUDIO' | 'VIDEO';
export type CallStatus = 'INITIATED' | 'RINGING' | 'CONNECTED' | 'ACTIVE' | 'ENDED';
export type CallEndReason = 'COMPLETED' | 'MISSED' | 'DECLINED' | 'FAILED' | 'TIMEOUT' | 'NETWORK_ERROR';
export type ParticipantStatus = 'INVITED' | 'JOINED' | 'LEFT';

export interface Call {
  id: string;
  conversation_id: string;
  type: CallType;
  status: CallStatus;
  initiator_id: string;
  started_at?: string;
  ended_at?: string;
  duration?: number;
  created_at: string;
}

export interface CallParticipant {
  call_id: string;
  user_id: string;
  status: ParticipantStatus;
  audio_muted: boolean;
  video_muted: boolean;
  joined_at?: string;
  left_at?: string;
  user?: {
    id: string;
    display_name: string;
    avatar_url?: string;
  };
}

export interface CallQualityMetric {
  id: string;
  call_id: string;
  user_id: string;
  timestamp: string;
  packet_loss: number;
  jitter: number;
  latency: number;
  bitrate: number;
  frame_rate?: number;
  resolution?: string;
  audio_level?: number;
}
