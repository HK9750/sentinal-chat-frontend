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

interface CallState {
  // Core state
  activeCall: ActiveCall | null;
  incomingCall: IncomingCall | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  peerConnection: RTCPeerConnection | null;
  pendingSignals: PendingCallSignal[];
  
  // Media controls
  microphoneMuted: boolean;
  cameraMuted: boolean;
 
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
  setPeerConnection: (connection: RTCPeerConnection | null) => void;
  enqueueSignal: (signal: PendingCallSignal) => void;
  removeSignal: (signalId: string) => void;
  setCallStatus: (status: ActiveCall['status'], reason?: string) => void;
  
  // Actions - Media controls
  toggleMicrophone: () => void;
  toggleCamera: () => void;
  
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
  peerConnection: null,
  pendingSignals: [],
  microphoneMuted: false,
  cameraMuted: false,
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
        ? { ...state.activeCall, status, ended_reason: reason }
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
    const { peerConnection, localStream, remoteStream } = get();
    
    // Close peer connection
    if (peerConnection) {
      peerConnection.close();
    }
    
    // Stop all tracks
    localStream?.getTracks().forEach((track) => track.stop());
    remoteStream?.getTracks().forEach((track) => track.stop());
    
    set({
      activeCall: null,
      incomingCall: null,
      localStream: null,
      remoteStream: null,
      peerConnection: null,
      pendingSignals: [],
      microphoneMuted: false,
      cameraMuted: false,
      callQuality: 'unknown',
      lastQualityMetrics: null,
      isReconnecting: false,
    });
  },
}));
