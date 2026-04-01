'use client';

import { useCallback, useEffect, useRef } from 'react';
import {
  CallError,
  createNetworkMonitor,
  createPeerConnection,
  getCallQualityMetrics,
  getScreenShareStream,
  getUserMediaWithFallback,
  getUserMediaWithDevice,
  performIceRestart,
  waitForIceGathering,
  type CallQualityMetrics,
  type ConnectionEventHandlers,
  type NetworkMonitor,
  type ScreenShareOptions,
} from '@/services/call-service';
import { useCallStore } from '@/stores/call-store';

const QUALITY_CHECK_INTERVAL_MS = 2000;
const MAX_RECONNECT_ATTEMPTS = 3;
const RECONNECT_DELAY_MS = 1000;

interface UseWebRtcOptions {
  onQualityChange?: (metrics: CallQualityMetrics) => void;
  onConnectionLost?: () => void;
  onConnectionRestored?: () => void;
  onError?: (error: CallError) => void;
  onScreenShareEnded?: () => void;
}

export function useWebRtc(options: UseWebRtcOptions = {}) {
  const setPeerConnection = useCallStore((state) => state.setPeerConnection);
  const setStreams = useCallStore((state) => state.setStreams);
  const setScreenStream = useCallStore((state) => state.setScreenStream);
  const setScreenSharing = useCallStore((state) => state.setScreenSharing);
  const setCallStatus = useCallStore((state) => state.setCallStatus);
  const peerConnection = useCallStore((state) => state.peerConnection);
  const activeCall = useCallStore((state) => state.activeCall);
  const localStream = useCallStore((state) => state.localStream);
  const screenStream = useCallStore((state) => state.screenStream);

  // Refs for cleanup and state management
  const qualityIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const networkMonitorRef = useRef<NetworkMonitor | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const isReconnectingRef = useRef(false);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const screenSenderRef = useRef<RTCRtpSender | null>(null);

  // Quality metrics history for averaging
  const metricsHistoryRef = useRef<CallQualityMetrics[]>([]);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (qualityIntervalRef.current) {
      clearInterval(qualityIntervalRef.current);
      qualityIntervalRef.current = null;
    }
    if (networkMonitorRef.current) {
      networkMonitorRef.current.stop();
      networkMonitorRef.current = null;
    }
    metricsHistoryRef.current = [];
    reconnectAttemptsRef.current = 0;
    isReconnectingRef.current = false;
    remoteStreamRef.current = null;
    screenSenderRef.current = null;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  // Start quality monitoring
  const startQualityMonitoring = useCallback(
    (connection: RTCPeerConnection) => {
      if (qualityIntervalRef.current) {
        clearInterval(qualityIntervalRef.current);
      }

      qualityIntervalRef.current = setInterval(async () => {
        if (connection.connectionState !== 'connected') {
          return;
        }

        try {
          const metrics = await getCallQualityMetrics(connection);
          metricsHistoryRef.current.push(metrics);

          // Keep only last 30 samples (1 minute at 2s intervals)
          if (metricsHistoryRef.current.length > 30) {
            metricsHistoryRef.current.shift();
          }

          options.onQualityChange?.(metrics);
        } catch {
          // Ignore errors during quality check
        }
      }, QUALITY_CHECK_INTERVAL_MS);
    },
    [options]
  );

  // Handle ICE restart for recovery
  const attemptIceRestart = useCallback(
    async (connection: RTCPeerConnection): Promise<RTCSessionDescriptionInit | null> => {
      if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
        setCallStatus('failed', 'Connection could not be restored after multiple attempts.');
        options.onError?.(
          new CallError(
            'Max reconnection attempts reached',
            'ICE_CONNECTION_FAILED',
            false
          )
        );
        return null;
      }

      reconnectAttemptsRef.current++;
      isReconnectingRef.current = true;
      setCallStatus('connecting', `Reconnecting... (attempt ${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS})`);

      try {
        const offer = await performIceRestart(connection);
        await waitForIceGathering(connection);
        return offer;
      } catch {
        isReconnectingRef.current = false;
        options.onError?.(
          new CallError(
            'ICE restart failed',
            'ICE_CONNECTION_FAILED',
            reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS
          )
        );
        return null;
      }
    },
    [options, setCallStatus]
  );

  // Create peer connection with all handlers
  const createConnection = useCallback(
    async (
      onIceCandidate: (candidate: RTCIceCandidate) => void,
      onIceRestart?: (offer: RTCSessionDescriptionInit) => void
    ): Promise<RTCPeerConnection> => {
      // Create remote stream container
      const remoteStream = new MediaStream();
      remoteStreamRef.current = remoteStream;

      const handlers: ConnectionEventHandlers = {
        onIceCandidate,

        onTrack: (event) => {
          for (const track of event.streams[0]?.getTracks() ?? []) {
            remoteStream.addTrack(track);
          }
          setStreams(useCallStore.getState().localStream, remoteStream);
        },

        onConnectionStateChange: (state) => {
          switch (state) {
            case 'connected':
              reconnectAttemptsRef.current = 0;
              isReconnectingRef.current = false;
              setCallStatus('connected');
              options.onConnectionRestored?.();
              break;

            case 'disconnected':
              options.onConnectionLost?.();
              // Don't immediately fail - wait for ICE to potentially recover
              setCallStatus('connecting', 'Connection interrupted, attempting to recover...');
              break;

            case 'failed':
              if (!isReconnectingRef.current) {
                setCallStatus('failed', 'Connection failed');
                options.onError?.(
                  new CallError('Peer connection failed', 'PEER_CONNECTION_FAILED', true)
                );
              }
              break;

            case 'closed':
              cleanup();
              break;
          }
        },

        onIceConnectionStateChange: (state) => {
          switch (state) {
            case 'disconnected':
              // Network interruption - attempt ICE restart after delay
              setTimeout(async () => {
                const connection = useCallStore.getState().peerConnection;
                if (
                  connection &&
                  connection.iceConnectionState === 'disconnected' &&
                  !isReconnectingRef.current
                ) {
                  const offer = await attemptIceRestart(connection);
                  if (offer) {
                    onIceRestart?.(offer);
                  }
                }
              }, RECONNECT_DELAY_MS);
              break;

            case 'failed':
              // ICE failed - attempt restart
              const connection = useCallStore.getState().peerConnection;
              if (connection && !isReconnectingRef.current) {
                void (async () => {
                  const offer = await attemptIceRestart(connection);
                  if (offer) {
                    onIceRestart?.(offer);
                  }
                })();
              }
              break;

            case 'connected':
            case 'completed':
              isReconnectingRef.current = false;
              break;
          }
        },

        onIceGatheringStateChange: () => {
          // Could be used for debugging/logging
        },

        onNegotiationNeeded: () => {
          // Handle renegotiation if needed (e.g., adding/removing tracks)
        },
      };

      const connection = createPeerConnection(handlers);
      setPeerConnection(connection);

      // Start quality monitoring
      startQualityMonitoring(connection);

      // Set up network monitoring
      networkMonitorRef.current = createNetworkMonitor();
      networkMonitorRef.current.onOffline(() => {
        options.onConnectionLost?.();
        setCallStatus('connecting', 'Network disconnected, waiting for connection...');
      });
      networkMonitorRef.current.onOnline(() => {
        // Network restored - attempt ICE restart
        const currentConnection = useCallStore.getState().peerConnection;
        if (
          currentConnection &&
          currentConnection.connectionState !== 'connected' &&
          !isReconnectingRef.current
        ) {
          void (async () => {
            const offer = await attemptIceRestart(currentConnection);
            if (offer) {
              onIceRestart?.(offer);
            }
          })();
        }
      });
      networkMonitorRef.current.start();

      return connection;
    },
    [
      attemptIceRestart,
      cleanup,
      options,
      setCallStatus,
      setPeerConnection,
      setStreams,
      startQualityMonitoring,
    ]
  );

  // Legacy createPeerConnection for backward compatibility
  const createPeerConnectionLegacy = useCallback(async () => {
    const connection = await createConnection(
      () => {}, // ICE candidates handled externally
      undefined
    );
    return connection;
  }, [createConnection]);

  // Ensure local stream with error handling
  const ensureLocalStream = useCallback(
    async (mode: 'audio' | 'video'): Promise<MediaStream> => {
      try {
        const stream = await getUserMediaWithFallback(mode);
        setStreams(stream, useCallStore.getState().remoteStream);
        return stream;
      } catch (error) {
        if (error instanceof CallError) {
          options.onError?.(error);
          throw error;
        }
        const callError = new CallError(
          'Failed to access media devices',
          'UNKNOWN',
          false
        );
        options.onError?.(callError);
        throw callError;
      }
    },
    [options, setStreams]
  );

  // Get local stream with specific devices
  const getLocalStreamWithDevices = useCallback(
    async (
      audioDeviceId?: string,
      videoDeviceId?: string,
      mode: 'audio' | 'video' = 'video'
    ): Promise<MediaStream> => {
      try {
        const stream = await getUserMediaWithDevice(audioDeviceId, videoDeviceId, mode);
        setStreams(stream, useCallStore.getState().remoteStream);
        return stream;
      } catch (error) {
        if (error instanceof CallError) {
          options.onError?.(error);
          throw error;
        }
        const callError = new CallError(
          'Failed to access media devices',
          'UNKNOWN',
          false
        );
        options.onError?.(callError);
        throw callError;
      }
    },
    [options, setStreams]
  );

  // Stop screen sharing - defined first as it's used by other functions
  const stopScreenShare = useCallback(() => {
    const currentScreenStream = useCallStore.getState().screenStream;
    const connection = useCallStore.getState().peerConnection;

    // Stop all tracks
    currentScreenStream?.getTracks().forEach((track) => track.stop());

    // Remove sender from connection
    if (connection && screenSenderRef.current) {
      try {
        connection.removeTrack(screenSenderRef.current);
      } catch {
        // Ignore error if track already removed
      }
      screenSenderRef.current = null;
    }

    setScreenStream(null);
    setScreenSharing(false);
  }, [setScreenStream, setScreenSharing]);

  // Restore video from screen share - defined before replaceVideoWithScreenShare
  const restoreVideoFromScreenShare = useCallback(async () => {
    const connection = useCallStore.getState().peerConnection;
    const currentLocalStream = useCallStore.getState().localStream;
    const currentScreenStream = useCallStore.getState().screenStream;

    // Stop screen share tracks
    currentScreenStream?.getTracks().forEach((track) => track.stop());

    if (connection && currentLocalStream) {
      const cameraVideoTrack = currentLocalStream.getVideoTracks()[0];

      if (cameraVideoTrack) {
        // Re-enable camera track
        cameraVideoTrack.enabled = true;

        // Find the video sender and restore the camera track
        const videoSender = connection.getSenders().find(
          (sender) => sender.track?.kind === 'video' || !sender.track
        );

        if (videoSender) {
          await videoSender.replaceTrack(cameraVideoTrack);
        }
      }
    }

    setScreenStream(null);
    setScreenSharing(false);
  }, [setScreenStream, setScreenSharing]);

  // Start screen sharing
  const startScreenShare = useCallback(
    async (shareOptions?: ScreenShareOptions): Promise<MediaStream> => {
      try {
        const stream = await getScreenShareStream(shareOptions);
        
        // Set up track ended handler to detect when user stops sharing
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
          videoTrack.onended = () => {
            stopScreenShare();
            options.onScreenShareEnded?.();
          };
        }

        // If we have a peer connection, add the screen share track
        const connection = useCallStore.getState().peerConnection;
        if (connection && videoTrack) {
          // Add screen share track to the connection
          const sender = connection.addTrack(videoTrack, stream);
          screenSenderRef.current = sender;
        }

        setScreenStream(stream);
        setScreenSharing(true);
        return stream;
      } catch (error) {
        if (error instanceof CallError) {
          options.onError?.(error);
          throw error;
        }
        const callError = new CallError(
          'Failed to start screen sharing',
          'UNKNOWN',
          false
        );
        options.onError?.(callError);
        throw callError;
      }
    },
    [options, setScreenStream, setScreenSharing, stopScreenShare]
  );

  // Replace video track with screen share (instead of adding new track)
  const replaceVideoWithScreenShare = useCallback(
    async (shareOptions?: ScreenShareOptions): Promise<MediaStream | null> => {
      const connection = useCallStore.getState().peerConnection;
      const currentLocalStream = useCallStore.getState().localStream;

      if (!connection) {
        return startScreenShare(shareOptions);
      }

      try {
        const stream = await getScreenShareStream(shareOptions);
        const screenVideoTrack = stream.getVideoTracks()[0];

        if (!screenVideoTrack) {
          throw new CallError('No video track in screen share', 'UNKNOWN', false);
        }

        // Set up track ended handler
        screenVideoTrack.onended = () => {
          // Restore camera when screen share ends
          restoreVideoFromScreenShare();
          options.onScreenShareEnded?.();
        };

        // Find the video sender and replace its track
        const videoSender = connection.getSenders().find(
          (sender) => sender.track?.kind === 'video'
        );

        if (videoSender) {
          await videoSender.replaceTrack(screenVideoTrack);
        } else {
          // No video sender, add the track
          const sender = connection.addTrack(screenVideoTrack, stream);
          screenSenderRef.current = sender;
        }

        // Disable local camera track (keep it for later)
        currentLocalStream?.getVideoTracks().forEach((track) => {
          track.enabled = false;
        });

        setScreenStream(stream);
        setScreenSharing(true);
        return stream;
      } catch (error) {
        if (error instanceof CallError) {
          options.onError?.(error);
          throw error;
        }
        const callError = new CallError(
          'Failed to start screen sharing',
          'UNKNOWN',
          false
        );
        options.onError?.(callError);
        throw callError;
      }
    },
    [options, setScreenStream, setScreenSharing, startScreenShare, restoreVideoFromScreenShare]
  );

  // Attach local tracks to connection
  const attachLocalTracks = useCallback(
    async (connection: RTCPeerConnection, stream: MediaStream) => {
      const senders = connection.getSenders();
      const existingTrackIds = new Set(senders.map((s) => s.track?.id).filter(Boolean));

      for (const track of stream.getTracks()) {
        if (!existingTrackIds.has(track.id)) {
          connection.addTrack(track, stream);
        }
      }
    },
    []
  );

  // Replace track (for switching cameras/mics)
  const replaceTrack = useCallback(
    async (
      connection: RTCPeerConnection,
      oldTrack: MediaStreamTrack,
      newTrack: MediaStreamTrack
    ): Promise<void> => {
      const sender = connection.getSenders().find((s) => s.track === oldTrack);
      if (sender) {
        await sender.replaceTrack(newTrack);
      }
    },
    []
  );

  // Switch camera
  const switchCamera = useCallback(
    async (deviceId: string): Promise<void> => {
      const connection = useCallStore.getState().peerConnection;
      const currentLocalStream = useCallStore.getState().localStream;

      if (!connection || !currentLocalStream) {
        return;
      }

      try {
        const newStream = await getUserMediaWithDevice(
          undefined, // Keep current audio device
          deviceId,
          'video'
        );

        const newVideoTrack = newStream.getVideoTracks()[0];
        const oldVideoTrack = currentLocalStream.getVideoTracks()[0];

        if (newVideoTrack && oldVideoTrack) {
          await replaceTrack(connection, oldVideoTrack, newVideoTrack);
          oldVideoTrack.stop();

          // Update local stream
          currentLocalStream.removeTrack(oldVideoTrack);
          currentLocalStream.addTrack(newVideoTrack);
        }
      } catch (error) {
        if (error instanceof CallError) {
          options.onError?.(error);
        } else {
          options.onError?.(
            new CallError('Failed to switch camera', 'UNKNOWN', false)
          );
        }
      }
    },
    [options, replaceTrack]
  );

  // Switch microphone
  const switchMicrophone = useCallback(
    async (deviceId: string): Promise<void> => {
      const connection = useCallStore.getState().peerConnection;
      const currentLocalStream = useCallStore.getState().localStream;

      if (!connection || !currentLocalStream) {
        return;
      }

      try {
        const newStream = await getUserMediaWithDevice(
          deviceId,
          undefined, // Keep current video device
          'audio'
        );

        const newAudioTrack = newStream.getAudioTracks()[0];
        const oldAudioTrack = currentLocalStream.getAudioTracks()[0];

        if (newAudioTrack && oldAudioTrack) {
          await replaceTrack(connection, oldAudioTrack, newAudioTrack);
          oldAudioTrack.stop();

          // Update local stream
          currentLocalStream.removeTrack(oldAudioTrack);
          currentLocalStream.addTrack(newAudioTrack);
        }
      } catch (error) {
        if (error instanceof CallError) {
          options.onError?.(error);
        } else {
          options.onError?.(
            new CallError('Failed to switch microphone', 'UNKNOWN', false)
          );
        }
      }
    },
    [options, replaceTrack]
  );

  // Get current quality metrics
  const getQualityMetrics = useCallback(async (): Promise<CallQualityMetrics | null> => {
    if (!peerConnection || peerConnection.connectionState !== 'connected') {
      return null;
    }
    return getCallQualityMetrics(peerConnection);
  }, [peerConnection]);

  // Manual ICE restart
  const restartIce = useCallback(async (): Promise<RTCSessionDescriptionInit | null> => {
    if (!peerConnection) {
      return null;
    }
    reconnectAttemptsRef.current = 0; // Reset counter for manual restart
    return attemptIceRestart(peerConnection);
  }, [attemptIceRestart, peerConnection]);

  return {
    peerConnection,
    localStream,
    screenStream,
    activeCall,
    // Connection management
    createPeerConnection: createPeerConnectionLegacy,
    createConnection,
    ensureLocalStream,
    getLocalStreamWithDevices,
    attachLocalTracks,
    replaceTrack,
    cleanup,
    // Screen sharing
    startScreenShare,
    stopScreenShare,
    replaceVideoWithScreenShare,
    restoreVideoFromScreenShare,
    // Device switching
    switchCamera,
    switchMicrophone,
    // Recovery
    restartIce,
    // Quality
    getQualityMetrics,
  };
}
