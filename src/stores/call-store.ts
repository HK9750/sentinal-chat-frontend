import { create } from 'zustand';
import type { Call, CallParticipant, CallType } from '@/types/call';

export type CallUIState = 'idle' | 'outgoing' | 'incoming' | 'connecting' | 'active';

export interface LocalMediaState {
  audioEnabled: boolean;
  videoEnabled: boolean;
  screenShareEnabled: boolean;
  audioInputDeviceId?: string;
  videoInputDeviceId?: string;
}

export interface RemoteStream {
  odparticipantId: string;
  stream: MediaStream | null;
}

interface CallState {
  uiState: CallUIState;
  activeCall: Call | null;
  participants: CallParticipant[];
  
  localStream: MediaStream | null;
  localMediaState: LocalMediaState;
  
  remoteStreams: Map<string, MediaStream>;
  
  peerConnections: Map<string, RTCPeerConnection>;
  
  incomingCallerId: string | null;
  incomingCallerName: string | null;
  incomingCallType: CallType | null;
  
  callStartTime: number | null;
  
  initiateCall: (conversationId: string, callType: CallType) => void;
  setIncomingCall: (call: Call, callerId: string, callerName: string) => void;
  acceptCall: () => void;
  declineCall: () => void;
  setActiveCall: (call: Call) => void;
  setParticipants: (participants: CallParticipant[]) => void;
  addParticipant: (participant: CallParticipant) => void;
  updateParticipant: (participantId: string, updates: Partial<CallParticipant>) => void;
  removeParticipant: (participantId: string) => void;
  setLocalStream: (stream: MediaStream | null) => void;
  setRemoteStream: (participantId: string, stream: MediaStream | null) => void;
  setPeerConnection: (participantId: string, pc: RTCPeerConnection | null) => void;
  toggleAudio: () => void;
  toggleVideo: () => void;
  toggleScreenShare: () => void;
  setAudioInputDevice: (deviceId: string) => void;
  setVideoInputDevice: (deviceId: string) => void;
  endCall: () => void;
  resetCallState: () => void;
}

const initialLocalMediaState: LocalMediaState = {
  audioEnabled: true,
  videoEnabled: true,
  screenShareEnabled: false,
};

export const useCallStore = create<CallState>((set, get) => ({
  uiState: 'idle',
  activeCall: null,
  participants: [],
  localStream: null,
  localMediaState: initialLocalMediaState,
  remoteStreams: new Map(),
  peerConnections: new Map(),
  incomingCallerId: null,
  incomingCallerName: null,
  incomingCallType: null,
  callStartTime: null,

  initiateCall: (conversationId, callType) => {
    set({
      uiState: 'outgoing',
      incomingCallType: callType,
      localMediaState: {
        ...initialLocalMediaState,
        videoEnabled: callType === 'VIDEO',
      },
    });
  },

  setIncomingCall: (call, callerId, callerName) => {
    set({
      uiState: 'incoming',
      activeCall: call,
      incomingCallerId: callerId,
      incomingCallerName: callerName,
      incomingCallType: call.type,
    });
  },

  acceptCall: () => {
    set({
      uiState: 'connecting',
    });
  },

  declineCall: () => {
    get().resetCallState();
  },

  setActiveCall: (call) => {
    set({
      activeCall: call,
      uiState: call.status === 'ACTIVE' ? 'active' : 'connecting',
      callStartTime: call.status === 'ACTIVE' ? Date.now() : get().callStartTime,
    });
  },

  setParticipants: (participants) => {
    set({ participants });
  },

  addParticipant: (participant) => {
    set((state) => ({
      participants: [...state.participants, participant],
    }));
  },

  updateParticipant: (participantId, updates) => {
    set((state) => ({
      participants: state.participants.map((p) =>
        p.user_id === participantId ? { ...p, ...updates } : p
      ),
    }));
  },

  removeParticipant: (participantId) => {
    set((state) => ({
      participants: state.participants.filter((p) => p.user_id !== participantId),
    }));
  },

  setLocalStream: (stream) => {
    const oldStream = get().localStream;
    if (oldStream) {
      oldStream.getTracks().forEach((track) => track.stop());
    }
    set({ localStream: stream });
  },

  setRemoteStream: (participantId, stream) => {
    set((state) => {
      const newStreams = new Map(state.remoteStreams);
      if (stream) {
        newStreams.set(participantId, stream);
      } else {
        newStreams.delete(participantId);
      }
      return { remoteStreams: newStreams };
    });
  },

  setPeerConnection: (participantId, pc) => {
    set((state) => {
      const newConnections = new Map(state.peerConnections);
      if (pc) {
        newConnections.set(participantId, pc);
      } else {
        const existing = newConnections.get(participantId);
        if (existing) {
          existing.close();
        }
        newConnections.delete(participantId);
      }
      return { peerConnections: newConnections };
    });
  },

  toggleAudio: () => {
    const { localStream, localMediaState } = get();
    const newAudioEnabled = !localMediaState.audioEnabled;
    
    if (localStream) {
      localStream.getAudioTracks().forEach((track) => {
        track.enabled = newAudioEnabled;
      });
    }
    
    set({
      localMediaState: {
        ...localMediaState,
        audioEnabled: newAudioEnabled,
      },
    });
  },

  toggleVideo: () => {
    const { localStream, localMediaState } = get();
    const newVideoEnabled = !localMediaState.videoEnabled;
    
    if (localStream) {
      localStream.getVideoTracks().forEach((track) => {
        track.enabled = newVideoEnabled;
      });
    }
    
    set({
      localMediaState: {
        ...localMediaState,
        videoEnabled: newVideoEnabled,
      },
    });
  },

  toggleScreenShare: () => {
    set((state) => ({
      localMediaState: {
        ...state.localMediaState,
        screenShareEnabled: !state.localMediaState.screenShareEnabled,
      },
    }));
  },

  setAudioInputDevice: (deviceId) => {
    set((state) => ({
      localMediaState: {
        ...state.localMediaState,
        audioInputDeviceId: deviceId,
      },
    }));
  },

  setVideoInputDevice: (deviceId) => {
    set((state) => ({
      localMediaState: {
        ...state.localMediaState,
        videoInputDeviceId: deviceId,
      },
    }));
  },

  endCall: () => {
    const { localStream, peerConnections, remoteStreams } = get();
    
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
    }
    
    peerConnections.forEach((pc) => pc.close());
    
    remoteStreams.forEach((stream) => {
      stream.getTracks().forEach((track) => track.stop());
    });
    
    get().resetCallState();
  },

  resetCallState: () => {
    set({
      uiState: 'idle',
      activeCall: null,
      participants: [],
      localStream: null,
      localMediaState: initialLocalMediaState,
      remoteStreams: new Map(),
      peerConnections: new Map(),
      incomingCallerId: null,
      incomingCallerName: null,
      incomingCallType: null,
      callStartTime: null,
    });
  },
}));
