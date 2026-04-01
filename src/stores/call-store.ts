'use client';

import { create } from 'zustand';
import type { ActiveCall, IncomingCall, ServerCallSignalPayload } from '@/types';
import type { CallQualityMetrics } from '@/services/call-service';

export interface PendingCallSignal {
  id: string;
  type: 'call:offer' | 'call:answer' | 'call:ice';
  call_id: string;
  conversation_id?: string;
  signal: ServerCallSignalPayload;
}

export type CallQuality = 'excellent' | 'good' | 'fair' | 'poor' | 'unknown';

export type ScreenShareMode = 'none' | 'local' | 'remote';

export interface MediaDevice {
  deviceId: string;
  label: string;
  kind: MediaDeviceKind;
}

interface CallState {
  // Core state
  activeCall: ActiveCall | null;
  incomingCall: IncomingCall | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  screenStream: MediaStream | null;
  peerConnection: RTCPeerConnection | null;
  pendingSignals: PendingCallSignal[];
  
  // Media controls
  microphoneMuted: boolean;
  cameraMuted: boolean;
  speakerEnabled: boolean;
  
  // Screen sharing
  isScreenSharing: boolean;
  screenShareMode: ScreenShareMode;
  
  // UI state
  isFullscreen: boolean;
  isPictureInPicture: boolean;
  localVideoMinimized: boolean;
  showControls: boolean;
  
  // Device selection
  availableDevices: MediaDevice[];
  selectedAudioInput: string | null;
  selectedVideoInput: string | null;
  selectedAudioOutput: string | null;
 
  // Quality tracking
  callQuality: CallQuality;
  lastQualityMetrics: CallQualityMetrics | null;
  
  // Network state
  isReconnecting: boolean;

  
  // Actions - Core
  setIncomingCall: (call: IncomingCall | null) => void;
  setActiveCall: (call: ActiveCall | null) => void;
  updateActiveCall: (patch: Partial<ActiveCall>) => void;
  setStreams: (localStream: MediaStream | null, remoteStream: MediaStream | null) => void;
  setScreenStream: (screenStream: MediaStream | null) => void;
  setPeerConnection: (connection: RTCPeerConnection | null) => void;
  enqueueSignal: (signal: PendingCallSignal) => void;
  removeSignal: (signalId: string) => void;
  setCallStatus: (status: ActiveCall['status'], reason?: string) => void;
  
  // Actions - Media controls
  toggleMicrophone: () => void;
  toggleCamera: () => void;
  toggleSpeaker: () => void;
  
  // Actions - Screen sharing
  setScreenSharing: (isSharing: boolean) => void;
  setScreenShareMode: (mode: ScreenShareMode) => void;
  
  // Actions - UI state
  setFullscreen: (isFullscreen: boolean) => void;
  setPictureInPicture: (isPip: boolean) => void;
  setLocalVideoMinimized: (minimized: boolean) => void;
  setShowControls: (show: boolean) => void;
  
  // Actions - Device selection
  setAvailableDevices: (devices: MediaDevice[]) => void;
  setSelectedAudioInput: (deviceId: string | null) => void;
  setSelectedVideoInput: (deviceId: string | null) => void;
  setSelectedAudioOutput: (deviceId: string | null) => void;
  
  // Actions - Quality
  setLastQualityMetrics: (metrics: CallQualityMetrics | null) => void;
  
  // Actions - Reconnection
  setReconnecting: (isReconnecting: boolean) => void;
  
  // Actions - Reset
  resetCall: () => void;
}

export const useCallStore = create<CallState>((set, get) => ({
  // Initial state
  activeCall: null,
  incomingCall: null,
  localStream: null,
  remoteStream: null,
  screenStream: null,
  peerConnection: null,
  pendingSignals: [],
  microphoneMuted: false,
  cameraMuted: false,
  speakerEnabled: true,
  isScreenSharing: false,
  screenShareMode: 'none',
  isFullscreen: false,
  isPictureInPicture: false,
  localVideoMinimized: false,
  showControls: true,
  availableDevices: [],
  selectedAudioInput: null,
  selectedVideoInput: null,
  selectedAudioOutput: null,
  callQuality: 'unknown',
  lastQualityMetrics: null,
  isReconnecting: false,

  // Core actions
  setIncomingCall: (incomingCall) => set({ incomingCall }),

  setActiveCall: (activeCall) => set({ activeCall }),
  
  updateActiveCall: (patch) =>
    set((state) => ({
      activeCall: state.activeCall ? { ...state.activeCall, ...patch } : state.activeCall,
    })),
    
  setStreams: (localStream, remoteStream) => set({ localStream, remoteStream }),
  
  setScreenStream: (screenStream) => set({ screenStream }),
  
  setPeerConnection: (peerConnection) => set({ peerConnection }),
  
  enqueueSignal: (signal) =>
    set((state) => ({ pendingSignals: [...state.pendingSignals, signal] })),
    
  removeSignal: (signalId) =>
    set((state) => ({
      pendingSignals: state.pendingSignals.filter((signal) => signal.id !== signalId),
    })),
    
  setCallStatus: (status, reason) =>
    set((state) => ({
      activeCall: state.activeCall
        ? {
            ...state.activeCall,
            status,
            ended_reason: reason,
            connected_at:
              status === 'connected'
                ? state.activeCall.connected_at ?? new Date().toISOString()
                : state.activeCall.connected_at,
          }
        : state.activeCall,
    })),

  // Media control actions
  toggleMicrophone: () => {
    const { localStream, microphoneMuted } = get();
    const nextMuted = !microphoneMuted;
    localStream?.getAudioTracks().forEach((track) => {
      track.enabled = !nextMuted;
    });
    set({ microphoneMuted: nextMuted });
  },
  
  toggleCamera: () => {
    const { localStream, cameraMuted } = get();
    const nextMuted = !cameraMuted;
    localStream?.getVideoTracks().forEach((track) => {
      track.enabled = !nextMuted;
    });
    set({ cameraMuted: nextMuted });
  },
  
  toggleSpeaker: () => {
    set((state) => ({ speakerEnabled: !state.speakerEnabled }));
  },
  
  // Screen sharing actions
  setScreenSharing: (isScreenSharing) => set({ isScreenSharing }),
  
  setScreenShareMode: (screenShareMode) => set({ screenShareMode }),
  
  // UI state actions
  setFullscreen: (isFullscreen) => set({ isFullscreen }),
  
  setPictureInPicture: (isPictureInPicture) => set({ isPictureInPicture }),
  
  setLocalVideoMinimized: (localVideoMinimized) => set({ localVideoMinimized }),
  
  setShowControls: (showControls) => set({ showControls }),
  
  // Device selection actions
  setAvailableDevices: (availableDevices) => set({ availableDevices }),
  
  setSelectedAudioInput: (selectedAudioInput) => set({ selectedAudioInput }),
  
  setSelectedVideoInput: (selectedVideoInput) => set({ selectedVideoInput }),
  
  setSelectedAudioOutput: (selectedAudioOutput) => set({ selectedAudioOutput }),
  
  // Quality actions
  setLastQualityMetrics: (lastQualityMetrics) => {
    // Also derive quality level from metrics
    let quality: CallQuality = 'unknown';
    if (lastQualityMetrics) {
      const { packetsLost, packetsReceived, roundTripTime } = lastQualityMetrics;
      const totalPackets = packetsLost + packetsReceived;
      const lossRate = totalPackets > 0 ? packetsLost / totalPackets : 0;

      if (lossRate > 0.1 || (roundTripTime && roundTripTime > 0.5)) {
        quality = 'poor';
      } else if (lossRate > 0.05 || (roundTripTime && roundTripTime > 0.3)) {
        quality = 'fair';
      } else if (lossRate > 0.02 || (roundTripTime && roundTripTime > 0.15)) {
        quality = 'good';
      } else {
        quality = 'excellent';
      }
    }
    set({ lastQualityMetrics, callQuality: quality });
  },

  // Reconnection actions
  setReconnecting: (isReconnecting) => set({ isReconnecting }),

  // Reset
  resetCall: () => {
    const { peerConnection, localStream, remoteStream, screenStream } = get();
    
    // Close peer connection
    if (peerConnection) {
      peerConnection.close();
    }
    
    // Stop all tracks
    localStream?.getTracks().forEach((track) => track.stop());
    remoteStream?.getTracks().forEach((track) => track.stop());
    screenStream?.getTracks().forEach((track) => track.stop());
    
    set({
      activeCall: null,
      incomingCall: null,
      localStream: null,
      remoteStream: null,
      screenStream: null,
      peerConnection: null,
      pendingSignals: [],
      microphoneMuted: false,
      cameraMuted: false,
      speakerEnabled: true,
      isScreenSharing: false,
      screenShareMode: 'none',
      isFullscreen: false,
      isPictureInPicture: false,
      localVideoMinimized: false,
      showControls: true,
      callQuality: 'unknown',
      lastQualityMetrics: null,
      isReconnecting: false,
    });
  },
}));
