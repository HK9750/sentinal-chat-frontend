import { env } from '@/config/env';
import { SOCKET_EVENT } from '@/lib/constants';
import type { CallSignalPayload, CallType, ClientSocketFrame } from '@/types';

// ============================================================================
// Error Types
// ============================================================================

export class CallError extends Error {
  constructor(
    message: string,
    public readonly code: CallErrorCode,
    public readonly recoverable: boolean = false
  ) {
    super(message);
    this.name = 'CallError';
  }
}

export type CallErrorCode =
  | 'MEDIA_ACCESS_DENIED'
  | 'MEDIA_NOT_FOUND'
  | 'MEDIA_OVERCONSTRAINED'
  | 'PEER_CONNECTION_FAILED'
  | 'ICE_CONNECTION_FAILED'
  | 'ICE_GATHERING_TIMEOUT'
  | 'SIGNALING_FAILED'
  | 'CALL_TIMEOUT'
  | 'NETWORK_DISCONNECTED'
  | 'UNKNOWN';

// ============================================================================
// RTC Configuration
// ============================================================================

function buildIceServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [
    // Google STUN servers (free, reliable)
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
  ];

  // Add TURN server if configured (required for production behind symmetric NAT/firewalls)
  if (env.turnUrl && env.turnUsername && env.turnCredential) {
    servers.push({
      urls: env.turnUrl,
      username: env.turnUsername,
      credential: env.turnCredential,
    });

    // Also add TURNS (TLS) if URL supports it
    if (env.turnUrl.startsWith('turn:')) {
      const turnsUrl = env.turnUrl.replace('turn:', 'turns:').replace(':3478', ':5349');
      servers.push({
        urls: turnsUrl,
        username: env.turnUsername,
        credential: env.turnCredential,
      });
    }
  }

  return servers;
}

export const DEFAULT_RTC_CONFIGURATION: RTCConfiguration = {
  iceServers: buildIceServers(),
  iceCandidatePoolSize: 10,
  iceTransportPolicy: 'all', // Use 'relay' to force TURN (useful for testing)
  bundlePolicy: 'max-bundle',
  rtcpMuxPolicy: 'require',
};

// ============================================================================
// Call Quality Metrics
// ============================================================================

export interface CallQualityMetrics {
  timestamp: number;
  roundTripTime: number | null;
  packetsLost: number;
  packetsReceived: number;
  bytesReceived: number;
  jitter: number | null;
  audioLevel: number | null;
  framesPerSecond: number | null;
  frameWidth: number | null;
  frameHeight: number | null;
  connectionState: RTCPeerConnectionState;
  iceConnectionState: RTCIceConnectionState;
}

export async function getCallQualityMetrics(
  connection: RTCPeerConnection
): Promise<CallQualityMetrics> {
  const stats = await connection.getStats();
  let roundTripTime: number | null = null;
  let packetsLost = 0;
  let packetsReceived = 0;
  let bytesReceived = 0;
  let jitter: number | null = null;
  let audioLevel: number | null = null;
  let framesPerSecond: number | null = null;
  let frameWidth: number | null = null;
  let frameHeight: number | null = null;

  stats.forEach((report) => {
    if (report.type === 'candidate-pair' && report.state === 'succeeded') {
      roundTripTime = report.currentRoundTripTime ?? null;
    }

    if (report.type === 'inbound-rtp') {
      packetsLost += report.packetsLost ?? 0;
      packetsReceived += report.packetsReceived ?? 0;
      bytesReceived += report.bytesReceived ?? 0;
      jitter = report.jitter ?? jitter;

      if (report.kind === 'video') {
        framesPerSecond = report.framesPerSecond ?? null;
        frameWidth = report.frameWidth ?? null;
        frameHeight = report.frameHeight ?? null;
      }
    }

    if (report.type === 'media-source' && report.kind === 'audio') {
      audioLevel = report.audioLevel ?? null;
    }
  });

  return {
    timestamp: Date.now(),
    roundTripTime,
    packetsLost,
    packetsReceived,
    bytesReceived,
    jitter,
    audioLevel,
    framesPerSecond,
    frameWidth,
    frameHeight,
    connectionState: connection.connectionState,
    iceConnectionState: connection.iceConnectionState,
  };
}

// ============================================================================
// Media Utilities
// ============================================================================

export async function getUserMediaWithFallback(
  mode: 'audio' | 'video'
): Promise<MediaStream> {
  const constraints: MediaStreamConstraints = {
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
    video:
      mode === 'video'
        ? {
            width: { ideal: 1280, max: 1920 },
            height: { ideal: 720, max: 1080 },
            frameRate: { ideal: 30, max: 60 },
            facingMode: 'user',
          }
        : false,
  };

  try {
    return await navigator.mediaDevices.getUserMedia(constraints);
  } catch (error) {
    if (error instanceof DOMException) {
      switch (error.name) {
        case 'NotAllowedError':
        case 'PermissionDeniedError':
          throw new CallError(
            'Camera/microphone access denied. Please grant permissions.',
            'MEDIA_ACCESS_DENIED',
            false
          );

        case 'NotFoundError':
        case 'DevicesNotFoundError':
          throw new CallError(
            'No camera or microphone found.',
            'MEDIA_NOT_FOUND',
            false
          );

        case 'OverconstrainedError':
          // Fall back to lower quality
          if (mode === 'video') {
            try {
              return await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: { facingMode: 'user' },
              });
            } catch {
              // Fall back to audio only
              return await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: false,
              });
            }
          }
          throw new CallError(
            'Media constraints could not be satisfied.',
            'MEDIA_OVERCONSTRAINED',
            false
          );

        default:
          throw new CallError(
            `Media access failed: ${error.message}`,
            'UNKNOWN',
            false
          );
      }
    }
    throw error;
  }
}

// ============================================================================
// Connection Management
// ============================================================================

export interface ConnectionEventHandlers {
  onIceCandidate: (candidate: RTCIceCandidate) => void;
  onTrack: (event: RTCTrackEvent) => void;
  onConnectionStateChange: (state: RTCPeerConnectionState) => void;
  onIceConnectionStateChange: (state: RTCIceConnectionState) => void;
  onIceGatheringStateChange: (state: RTCIceGatheringState) => void;
  onNegotiationNeeded: () => void;
  onDataChannel?: (channel: RTCDataChannel) => void;
}

export function createPeerConnection(
  handlers: ConnectionEventHandlers
): RTCPeerConnection {
  const connection = new RTCPeerConnection(DEFAULT_RTC_CONFIGURATION);

  connection.onicecandidate = (event) => {
    if (event.candidate) {
      handlers.onIceCandidate(event.candidate);
    }
  };

  connection.ontrack = handlers.onTrack;

  connection.onconnectionstatechange = () => {
    handlers.onConnectionStateChange(connection.connectionState);
  };

  connection.oniceconnectionstatechange = () => {
    handlers.onIceConnectionStateChange(connection.iceConnectionState);
  };

  connection.onicegatheringstatechange = () => {
    handlers.onIceGatheringStateChange(connection.iceGatheringState);
  };

  connection.onnegotiationneeded = handlers.onNegotiationNeeded;

  if (handlers.onDataChannel) {
    connection.ondatachannel = (event) => {
      handlers.onDataChannel?.(event.channel);
    };
  }

  return connection;
}

export async function performIceRestart(
  connection: RTCPeerConnection
): Promise<RTCSessionDescriptionInit> {
  const offer = await connection.createOffer({ iceRestart: true });
  await connection.setLocalDescription(offer);
  return offer;
}

export function waitForIceGathering(
  connection: RTCPeerConnection,
  timeoutMs: number = env.iceGatheringTimeoutMs
): Promise<void> {
  return new Promise((resolve) => {
    if (connection.iceGatheringState === 'complete') {
      resolve();
      return;
    }

    const timeout = setTimeout(() => {
      connection.removeEventListener('icegatheringstatechange', checkState);
      // Don't reject - proceed with gathered candidates
      resolve();
    }, timeoutMs);

    function checkState() {
      if (connection.iceGatheringState === 'complete') {
        clearTimeout(timeout);
        connection.removeEventListener('icegatheringstatechange', checkState);
        resolve();
      }
    }

    connection.addEventListener('icegatheringstatechange', checkState);
  });
}

// ============================================================================
// Network Monitoring
// ============================================================================

export interface NetworkMonitor {
  start: () => void;
  stop: () => void;
  isOnline: () => boolean;
  onOnline: (callback: () => void) => void;
  onOffline: (callback: () => void) => void;
}

export function createNetworkMonitor(): NetworkMonitor {
  const onlineCallbacks: Array<() => void> = [];
  const offlineCallbacks: Array<() => void> = [];

  function handleOnline() {
    onlineCallbacks.forEach((cb) => cb());
  }

  function handleOffline() {
    offlineCallbacks.forEach((cb) => cb());
  }

  return {
    start() {
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
    },
    stop() {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    },
    isOnline() {
      return navigator.onLine;
    },
    onOnline(callback) {
      onlineCallbacks.push(callback);
    },
    onOffline(callback) {
      offlineCallbacks.push(callback);
    },
  };
}

// ============================================================================
// Call Timeout Management
// ============================================================================

export function createCallTimeout(
  onTimeout: () => void,
  durationMs: number = env.callTimeoutMs
): { clear: () => void } {
  const timeoutId = setTimeout(onTimeout, durationMs);
  return {
    clear: () => clearTimeout(timeoutId),
  };
}

// ============================================================================
// Frame Builders (Signaling)
// ============================================================================

function serializeCallSignalPayload(payload: CallSignalPayload): Record<string, unknown> {
  return {
    to_user_id: payload.to_user_id,
    ...(payload.sdp ? { sdp: payload.sdp } : {}),
    ...(payload.candidate ? { candidate: payload.candidate } : {}),
  };
}

export function buildCallStartFrame(
  conversationId: string,
  type: CallType,
  requestId?: string
): ClientSocketFrame<{ type: CallType }> {
  return {
    type: SOCKET_EVENT.callStart,
    request_id: requestId,
    conversation_id: conversationId,
    data: { type },
  };
}

export function buildCallOfferFrame(
  conversationId: string,
  callId: string,
  payload: CallSignalPayload,
  requestId?: string
): ClientSocketFrame<Record<string, unknown>> {
  return {
    type: SOCKET_EVENT.callOffer,
    request_id: requestId,
    conversation_id: conversationId,
    call_id: callId,
    data: serializeCallSignalPayload(payload),
  };
}

export function buildCallAnswerFrame(
  conversationId: string,
  callId: string,
  payload: CallSignalPayload,
  requestId?: string
): ClientSocketFrame<Record<string, unknown>> {
  return {
    type: SOCKET_EVENT.callAnswer,
    request_id: requestId,
    conversation_id: conversationId,
    call_id: callId,
    data: serializeCallSignalPayload(payload),
  };
}

export function buildCallIceFrame(
  conversationId: string,
  callId: string,
  payload: CallSignalPayload,
  requestId?: string
): ClientSocketFrame<Record<string, unknown>> {
  return {
    type: SOCKET_EVENT.callIce,
    request_id: requestId,
    conversation_id: conversationId,
    call_id: callId,
    data: serializeCallSignalPayload(payload),
  };
}

export function buildCallEndFrame(
  callId: string,
  reason: string,
  conversationId?: string,
  requestId?: string
): ClientSocketFrame<{ reason: string }> {
  return {
    type: SOCKET_EVENT.callEnd,
    request_id: requestId,
    call_id: callId,
    conversation_id: conversationId,
    data: { reason },
  };
}

export function buildIceRestartFrame(
  conversationId: string,
  callId: string,
  payload: CallSignalPayload,
  requestId?: string
): ClientSocketFrame<Record<string, unknown>> {
  return {
    type: SOCKET_EVENT.callOffer, // ICE restart uses offer with iceRestart flag
    request_id: requestId,
    conversation_id: conversationId,
    call_id: callId,
    data: {
      ...serializeCallSignalPayload(payload),
      ice_restart: true,
    },
  };
}
