'use client';

import { create } from 'zustand';
import type { ActiveCall, IncomingCall, ServerCallSignalPayload } from '@/types';

export interface PendingCallSignal {
  id: string;
  type: 'call:offer' | 'call:answer' | 'call:ice';
  call_id: string;
  conversation_id?: string;
  signal: ServerCallSignalPayload;
}

interface CallState {
  activeCall: ActiveCall | null;
  incomingCall: IncomingCall | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  peerConnection: RTCPeerConnection | null;
  pendingSignals: PendingCallSignal[];
  microphoneMuted: boolean;
  cameraMuted: boolean;
  setIncomingCall: (call: IncomingCall | null) => void;
  setActiveCall: (call: ActiveCall | null) => void;
  updateActiveCall: (patch: Partial<ActiveCall>) => void;
  setStreams: (localStream: MediaStream | null, remoteStream: MediaStream | null) => void;
  setPeerConnection: (connection: RTCPeerConnection | null) => void;
  enqueueSignal: (signal: PendingCallSignal) => void;
  removeSignal: (signalId: string) => void;
  setCallStatus: (status: ActiveCall['status'], reason?: string) => void;
  toggleMicrophone: () => void;
  toggleCamera: () => void;
  resetCall: () => void;
}

export const useCallStore = create<CallState>((set, get) => ({
  activeCall: null,
  incomingCall: null,
  localStream: null,
  remoteStream: null,
  peerConnection: null,
  pendingSignals: [],
  microphoneMuted: false,
  cameraMuted: false,
  setIncomingCall: (incomingCall) => set({ incomingCall }),
  setActiveCall: (activeCall) => set({ activeCall }),
  updateActiveCall: (patch) =>
    set((state) => ({
      activeCall: state.activeCall ? { ...state.activeCall, ...patch } : state.activeCall,
    })),
  setStreams: (localStream, remoteStream) => set({ localStream, remoteStream }),
  setPeerConnection: (peerConnection) => set({ peerConnection }),
  enqueueSignal: (signal) => set((state) => ({ pendingSignals: [...state.pendingSignals, signal] })),
  removeSignal: (signalId) =>
    set((state) => ({ pendingSignals: state.pendingSignals.filter((signal) => signal.id !== signalId) })),
  setCallStatus: (status, reason) =>
    set((state) => ({
      activeCall: state.activeCall ? { ...state.activeCall, status, ended_reason: reason } : state.activeCall,
    })),
  toggleMicrophone: () => {
    const current = get().localStream;
    const nextMuted = !get().microphoneMuted;
    current?.getAudioTracks().forEach((track) => {
      track.enabled = !nextMuted;
    });
    set({ microphoneMuted: nextMuted });
  },
  toggleCamera: () => {
    const current = get().localStream;
    const nextMuted = !get().cameraMuted;
    current?.getVideoTracks().forEach((track) => {
      track.enabled = !nextMuted;
    });
    set({ cameraMuted: nextMuted });
  },
  resetCall: () => {
    get().peerConnection?.close();
    get().localStream?.getTracks().forEach((track) => track.stop());
    get().remoteStream?.getTracks().forEach((track) => track.stop());
    set({
      activeCall: null,
      incomingCall: null,
      localStream: null,
      remoteStream: null,
      peerConnection: null,
      pendingSignals: [],
      microphoneMuted: false,
      cameraMuted: false,
    });
  },
}));
