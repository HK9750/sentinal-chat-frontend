"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Expand,
  LoaderCircle,
  Maximize2,
  Mic,
  MicOff,
  Minimize2,
  Monitor,
  MonitorOff,
  MoreVertical,
  Phone,
  PictureInPicture,
  ShieldCheck,
  Shrink,
  Signal,
  SignalHigh,
  SignalLow,
  SignalMedium,
  SignalZero,
  Video,
  VideoOff,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { UserAvatar } from "@/components/shared/user-avatar";
import { DeviceSelector } from "@/components/shared/device-selector";
import { useCallSignaling } from "@/hooks/use-call-signaling";
import { useWebRtc } from "@/hooks/use-webrtc";
import { useCallStore } from "@/stores/call-store";
import { useAuthStore } from "@/stores/auth-store";
import { cn, getOtherParticipant } from "@/lib/utils";
import { useConversation } from "@/queries/use-conversation-queries";

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  
  if (hours > 0) {
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
  }
  return `${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
}

interface ControlButtonProps {
  label: string;
  pressed?: boolean;
  destructive?: boolean;
  active?: boolean;
  disabled?: boolean;
  size?: "default" | "lg";
  onClick: () => void;
  children: React.ReactNode;
}

function ControlButton({
  label,
  pressed,
  destructive = false,
  active = false,
  disabled = false,
  size = "default",
  onClick,
  children,
}: ControlButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          size={size === "lg" ? "icon-lg" : "icon"}
          variant={
            destructive 
              ? "destructive" 
              : active 
                ? "default" 
                : pressed 
                  ? "secondary" 
                  : "outline"
          }
          className={cn(
            "rounded-full transition-all duration-200",
            size === "lg" ? "h-14 w-14" : "h-11 w-11",
            active && "ring-2 ring-primary ring-offset-2 ring-offset-background",
            "hover:scale-105 active:scale-95"
          )}
          onClick={onClick}
          disabled={disabled}
          aria-label={label}
          aria-pressed={pressed}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={8}>
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

function QualityIndicator({ quality }: { quality: string }) {
  const getIcon = () => {
    switch (quality) {
      case "excellent":
        return <SignalHigh className="h-4 w-4 text-green-500" />;
      case "good":
        return <SignalMedium className="h-4 w-4 text-green-400" />;
      case "fair":
        return <SignalLow className="h-4 w-4 text-yellow-500" />;
      case "poor":
        return <SignalZero className="h-4 w-4 text-red-500" />;
      default:
        return <Signal className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getLabel = () => {
    switch (quality) {
      case "excellent":
        return "Excellent";
      case "good":
        return "Good";
      case "fair":
        return "Fair";
      case "poor":
        return "Poor";
      default:
        return "Connecting";
    }
  };

  return (
    <div className="flex items-center gap-1.5 text-xs">
      {getIcon()}
      <span className="hidden sm:inline">{getLabel()}</span>
    </div>
  );
}

function AudioVisualizer({ stream, isActive }: { stream: MediaStream | null; isActive: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (!stream || !isActive || !canvasRef.current) {
      return;
    }

    // Get the primary color from CSS variables
    // The variable might be HSL values (e.g., "142 76% 36%") or a hex/rgb color
    const computedStyle = getComputedStyle(document.documentElement);
    const primaryValue = computedStyle.getPropertyValue('--primary').trim();
    
    let primaryColor = '#00a884';
    let primaryColorFaded = 'rgba(0, 168, 132, 0.3)';
    
    if (primaryValue) {
      // Check if it's already a valid color (hex, rgb, hsl with parentheses)
      if (primaryValue.startsWith('#') || primaryValue.startsWith('rgb') || primaryValue.startsWith('hsl(')) {
        primaryColor = primaryValue;
        // For faded version, try to add opacity
        if (primaryValue.startsWith('#')) {
          primaryColorFaded = `${primaryValue}4D`; // 4D is ~30% opacity in hex
        } else if (primaryValue.startsWith('rgb(')) {
          primaryColorFaded = primaryValue.replace('rgb(', 'rgba(').replace(')', ', 0.3)');
        } else {
          primaryColorFaded = primaryValue.replace(')', ' / 0.3)');
        }
      } else {
        // Assume it's HSL values without the hsl() wrapper (e.g., "142 76% 36%")
        primaryColor = `hsl(${primaryValue})`;
        primaryColorFaded = `hsl(${primaryValue} / 0.3)`;
      }
    }

    const audioContext = new AudioContext();
    audioContextRef.current = audioContext;
    const analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(stream);
    
    analyser.fftSize = 32;
    analyser.smoothingTimeConstant = 0.8;
    source.connect(analyser);
    analyserRef.current = analyser;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 2;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height;
        
        const gradient = ctx.createLinearGradient(0, canvas.height - barHeight, 0, canvas.height);
        gradient.addColorStop(0, primaryColor);
        gradient.addColorStop(1, primaryColorFaded);
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(x, canvas.height - barHeight, barWidth - 2, barHeight, 2);
        ctx.fill();

        x += barWidth;
      }
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      source.disconnect();
      audioContext.close();
    };
  }, [stream, isActive]);

  if (!isActive) {
    return null;
  }

  return (
    <canvas
      ref={canvasRef}
      width={120}
      height={40}
      className="opacity-80"
    />
  );
}

const CALL_STATUS_LABEL: Record<string, string> = {
  outgoing: "Calling...",
  connecting: "Connecting...",
  connected: "Connected",
  ended: "Call ended",
  failed: "Call failed",
};

export function ActiveCallOverlay() {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const screenVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const activeCall = useCallStore((state) => state.activeCall);
  const [now, setNow] = useState(() => Date.now());
  const localStream = useCallStore((state) => state.localStream);
  const remoteStream = useCallStore((state) => state.remoteStream);
  const screenStream = useCallStore((state) => state.screenStream);
  const microphoneMuted = useCallStore((state) => state.microphoneMuted);
  const cameraMuted = useCallStore((state) => state.cameraMuted);
  const speakerEnabled = useCallStore((state) => state.speakerEnabled);
  const isScreenSharing = useCallStore((state) => state.isScreenSharing);
  const isFullscreen = useCallStore((state) => state.isFullscreen);
  const isPictureInPicture = useCallStore((state) => state.isPictureInPicture);
  const localVideoMinimized = useCallStore((state) => state.localVideoMinimized);
  const showControls = useCallStore((state) => state.showControls);
  const toggleMicrophone = useCallStore((state) => state.toggleMicrophone);
  const toggleCamera = useCallStore((state) => state.toggleCamera);
  const toggleSpeaker = useCallStore((state) => state.toggleSpeaker);
  const setFullscreen = useCallStore((state) => state.setFullscreen);
  const setPictureInPicture = useCallStore((state) => state.setPictureInPicture);
  const setLocalVideoMinimized = useCallStore((state) => state.setLocalVideoMinimized);
  const setShowControls = useCallStore((state) => state.setShowControls);
  const callQuality = useCallStore((state) => state.callQuality);
  const isReconnecting = useCallStore((state) => state.isReconnecting);
  const resetCall = useCallStore((state) => state.resetCall);
  const currentUserId = useAuthStore((state) => state.user?.id);
  const conversationQuery = useConversation(activeCall?.conversation_id);
  const { endCall } = useCallSignaling(activeCall?.conversation_id);
  const { replaceVideoWithScreenShare, restoreVideoFromScreenShare } = useWebRtc();

  // Auto-hide controls
  const resetControlsTimeout = useCallback(() => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    setShowControls(true);
    controlsTimeoutRef.current = setTimeout(() => {
      if (activeCall?.status === "connected") {
        setShowControls(false);
      }
    }, 4000);
  }, [activeCall?.status, setShowControls]);

  useEffect(() => {
    if (activeCall?.status === "connected") {
      resetControlsTimeout();
    }
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [activeCall?.status, resetControlsTimeout]);

  // Timer for call duration
  useEffect(() => {
    if (!activeCall || activeCall.status !== "connected") {
      return;
    }

    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [activeCall]);

  const otherParticipant = useMemo(
    () =>
      conversationQuery.data
        ? getOtherParticipant(conversationQuery.data, currentUserId)
        : null,
    [conversationQuery.data, currentUserId],
  );

  // Video element refs
  useEffect(() => {
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
      remoteVideoRef.current.muted = !speakerEnabled;
      remoteVideoRef.current.volume = speakerEnabled ? 1 : 0;
    }
  }, [remoteStream, speakerEnabled]);

  useEffect(() => {
    if (screenVideoRef.current && screenStream) {
      screenVideoRef.current.srcObject = screenStream;
    }
  }, [screenStream]);

  useEffect(() => {
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = remoteStream;
      remoteAudioRef.current.muted = !speakerEnabled;
      remoteAudioRef.current.volume = speakerEnabled ? 1 : 0;
    }
  }, [remoteStream, speakerEnabled]);

  // Fullscreen handling
  const handleToggleFullscreen = useCallback(async () => {
    if (!containerRef.current) return;

    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
        setFullscreen(true);
      } else {
        await document.exitFullscreen();
        setFullscreen(false);
      }
    } catch (error) {
      console.error("Fullscreen error:", error);
    }
  }, [setFullscreen]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, [setFullscreen]);

  // Picture-in-Picture handling
  const handleTogglePiP = useCallback(async () => {
    const video = remoteVideoRef.current || localVideoRef.current;
    if (!video) return;

    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        setPictureInPicture(false);
      } else if (document.pictureInPictureEnabled) {
        await video.requestPictureInPicture();
        setPictureInPicture(true);
      }
    } catch (error) {
      console.error("PiP error:", error);
    }
  }, [setPictureInPicture]);

  useEffect(() => {
    const video = remoteVideoRef.current || localVideoRef.current;
    if (!video) return;

    const handlePiPChange = () => {
      setPictureInPicture(Boolean(document.pictureInPictureElement));
    };

    video.addEventListener("enterpictureinpicture", handlePiPChange);
    video.addEventListener("leavepictureinpicture", handlePiPChange);
    
    return () => {
      video.removeEventListener("enterpictureinpicture", handlePiPChange);
      video.removeEventListener("leavepictureinpicture", handlePiPChange);
    };
  }, [setPictureInPicture, remoteStream]);

  // Screen sharing
  const handleToggleScreenShare = useCallback(async () => {
    if (isScreenSharing) {
      await restoreVideoFromScreenShare();
    } else {
      try {
        await replaceVideoWithScreenShare();
      } catch {
        // User cancelled or error occurred
      }
    }
  }, [isScreenSharing, replaceVideoWithScreenShare, restoreVideoFromScreenShare]);

  const elapsedTime = (() => {
    if (!activeCall) {
      return 0;
    }

    const startTimestamp = activeCall.connected_at ?? activeCall.started_at;
    if (!startTimestamp) {
      return 0;
    }

    return Math.max(
      0,
      Math.floor((now - new Date(startTimestamp).getTime()) / 1000),
    );
  })();

  if (!activeCall) {
    return null;
  }

  const showVideoLayout = activeCall.type === "VIDEO";
  const participantName =
    otherParticipant?.display_name ?? otherParticipant?.username ?? "Contact";

  const statusText = (() => {
    if (isReconnecting) {
      return "Reconnecting...";
    }

    if (activeCall.status === "connected") {
      return formatDuration(elapsedTime);
    }

    if (activeCall.ended_reason) {
      return activeCall.ended_reason;
    }

    return CALL_STATUS_LABEL[activeCall.status] ?? "Connecting...";
  })();

  const handleEnd = () => {
    if (activeCall.status !== "ended") {
      endCall(activeCall.call_id, "hangup");
    }
    resetCall();
  };

  const isConnecting =
    activeCall.status === "outgoing" || activeCall.status === "connecting";

  return (
    <TooltipProvider delayDuration={100}>
      <div 
        ref={containerRef}
        className={cn(
          "fixed inset-0 z-50 flex flex-col bg-gradient-to-b from-background to-background/98 text-foreground",
          "transition-all duration-300"
        )}
        onMouseMove={resetControlsTimeout}
        onClick={resetControlsTimeout}
      >
        {activeCall.type === "AUDIO" ? (
          <audio ref={remoteAudioRef} autoPlay playsInline />
        ) : null}

        {/* Header - Always visible */}
        <div 
          className={cn(
            "absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 py-3",
            "bg-gradient-to-b from-background/90 via-background/60 to-transparent",
            "transition-opacity duration-300",
            showControls ? "opacity-100" : "opacity-0 pointer-events-none"
          )}
        >
          <div className="flex items-center gap-3">
            <UserAvatar
              size="sm"
              src={otherParticipant?.avatar_url}
              alt={participantName}
              fallback={participantName[0] ?? "C"}
              className="h-10 w-10 ring-2 ring-background"
            />
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                {participantName}
              </h2>
              <div className="flex items-center gap-2">
                <p className="text-xs text-muted-foreground">{statusText}</p>
                {activeCall.status === "connected" && (
                  <QualityIndicator quality={callQuality} />
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isScreenSharing && (
              <Badge variant="secondary" className="gap-1 bg-primary/10 text-primary">
                <Monitor className="h-3 w-3" />
                Sharing
              </Badge>
            )}
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-9 w-9 rounded-full"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Call Options</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleToggleFullscreen}>
                  {isFullscreen ? (
                    <>
                      <Shrink className="mr-2 h-4 w-4" />
                      Exit fullscreen
                    </>
                  ) : (
                    <>
                      <Expand className="mr-2 h-4 w-4" />
                      Fullscreen
                    </>
                  )}
                </DropdownMenuItem>
                {showVideoLayout && (
                  <DropdownMenuItem onClick={handleTogglePiP}>
                    <PictureInPicture className="mr-2 h-4 w-4" />
                    {isPictureInPicture ? "Exit PiP" : "Picture-in-Picture"}
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive" onClick={handleEnd}>
                  <Phone className="mr-2 h-4 w-4 rotate-[135deg]" />
                  End call
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DeviceSelector className="hidden sm:flex" />

            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-9 w-9 rounded-full"
              onClick={handleEnd}
              aria-label="Close call view"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="relative flex flex-1 items-center justify-center overflow-hidden">
          {showVideoLayout ? (
            <>
              {/* Remote Video / Screen Share - Full screen */}
              <div className="absolute inset-0 bg-muted">
                {isScreenSharing && screenStream ? (
                  <video
                    ref={screenVideoRef}
                    autoPlay
                    playsInline
                    className="h-full w-full object-contain bg-black"
                  />
                ) : remoteStream ? (
                  <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-6 text-center">
                    <div className="relative">
                      <div className="absolute -inset-4 animate-pulse rounded-full bg-primary/20" />
                      <UserAvatar
                        size="xl"
                        src={otherParticipant?.avatar_url}
                        alt={participantName}
                        fallback={participantName[0] ?? "C"}
                        className="relative h-32 w-32 ring-4 ring-primary/20"
                      />
                    </div>
                    <div className="space-y-2">
                      <p className="text-lg font-medium text-foreground">
                        {participantName}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {isConnecting ? "Connecting video..." : "Camera off"}
                      </p>
                      {isConnecting && (
                        <LoaderCircle className="mx-auto h-5 w-5 animate-spin text-primary" />
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Local Video PiP */}
              <div 
                className={cn(
                  "absolute z-10 overflow-hidden rounded-2xl shadow-2xl ring-1 ring-white/10",
                  "transition-all duration-300 ease-out",
                  localVideoMinimized 
                    ? "bottom-24 right-4 h-12 w-12 cursor-pointer"
                    : "bottom-24 right-4 h-[25vh] min-h-[140px] w-[28vw] min-w-[120px] max-w-[200px]",
                  "hover:ring-2 hover:ring-primary/50"
                )}
                onClick={() => localVideoMinimized && setLocalVideoMinimized(false)}
              >
                {localStream && !cameraMuted ? (
                  <>
                    <video
                      ref={localVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className={cn(
                        "h-full w-full object-cover",
                        "scale-x-[-1]" // Mirror local video
                      )}
                    />
                    {!localVideoMinimized && (
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="absolute top-1 right-1 h-6 w-6 rounded-full bg-black/40 hover:bg-black/60"
                        onClick={(e) => {
                          e.stopPropagation();
                          setLocalVideoMinimized(true);
                        }}
                      >
                        <Minimize2 className="h-3 w-3" />
                      </Button>
                    )}
                  </>
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-muted">
                    <UserAvatar
                      size={localVideoMinimized ? "sm" : "md"}
                      user={{ display_name: "You" }}
                    />
                    {!localVideoMinimized && (
                      <p className="text-[10px] text-muted-foreground">Camera off</p>
                    )}
                  </div>
                )}

                {localVideoMinimized && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                    <Maximize2 className="h-4 w-4 text-white" />
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Voice Call Layout */
            <div className="flex flex-col items-center justify-center gap-8 px-4">
              {/* Avatar with ring animation */}
              <div className="relative">
                {activeCall.status === "connected" && (
                  <>
                    <div className="absolute -inset-4 animate-ping rounded-full bg-primary/20 opacity-75" style={{ animationDuration: "2s" }} />
                    <div className="absolute -inset-8 animate-ping rounded-full bg-primary/10 opacity-50" style={{ animationDuration: "3s" }} />
                  </>
                )}
                <div className="relative rounded-full bg-gradient-to-br from-primary/20 to-primary/5 p-2">
                  <UserAvatar
                    size="xl"
                    src={otherParticipant?.avatar_url}
                    alt={participantName}
                    fallback={participantName[0] ?? "C"}
                    className="h-36 w-36 ring-4 ring-background shadow-2xl"
                  />
                  
                  {/* Status indicator */}
                  <div className={cn(
                    "absolute bottom-2 right-2 h-5 w-5 rounded-full ring-4 ring-background",
                    activeCall.status === "connected" ? "bg-green-500" : "bg-yellow-500 animate-pulse"
                  )} />
                </div>
              </div>

              {/* Name and status */}
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-semibold text-foreground">
                  {participantName}
                </h2>
                <div className="flex items-center justify-center gap-3">
                  <Badge variant="secondary" className="gap-1.5">
                    <Phone className="h-3 w-3" />
                    Voice Call
                  </Badge>
                  {activeCall.status === "connected" && (
                    <QualityIndicator quality={callQuality} />
                  )}
                </div>
                <p className="text-lg tabular-nums text-muted-foreground">
                  {statusText}
                </p>
              </div>

              {/* Audio visualizer */}
              {activeCall.status === "connected" && (
                <div className="flex flex-col items-center gap-2">
                  <AudioVisualizer 
                    stream={remoteStream} 
                    isActive={activeCall.status === "connected" && speakerEnabled} 
                  />
                  <p className="text-xs text-muted-foreground">
                    {speakerEnabled ? "Listening..." : "Speaker muted"}
                  </p>
                </div>
              )}

              {/* Security badge */}
              <div className="flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <span className="text-xs font-medium text-primary">
                  End-to-end encrypted
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Controls Bar */}
        <div 
          className={cn(
            "absolute bottom-0 left-0 right-0 z-20",
            "bg-gradient-to-t from-background via-background/80 to-transparent",
            "pb-[max(env(safe-area-inset-bottom),1.5rem)] pt-12",
            "transition-all duration-300",
            showControls ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
          )}
        >
          <div className="flex items-center justify-center gap-3 px-4">
            {/* Microphone */}
            <ControlButton
              label={microphoneMuted ? "Unmute microphone" : "Mute microphone"}
              pressed={microphoneMuted}
              onClick={toggleMicrophone}
            >
              {microphoneMuted ? (
                <MicOff className="h-5 w-5" />
              ) : (
                <Mic className="h-5 w-5" />
              )}
            </ControlButton>

            {/* Camera (video calls only) */}
            {showVideoLayout && (
              <ControlButton
                label={cameraMuted ? "Turn camera on" : "Turn camera off"}
                pressed={cameraMuted}
                onClick={toggleCamera}
              >
                {cameraMuted ? (
                  <VideoOff className="h-5 w-5" />
                ) : (
                  <Video className="h-5 w-5" />
                )}
              </ControlButton>
            )}

            {/* Screen Share (video calls only) */}
            {showVideoLayout && (
              <ControlButton
                label={isScreenSharing ? "Stop sharing" : "Share screen"}
                active={isScreenSharing}
                onClick={handleToggleScreenShare}
              >
                {isScreenSharing ? (
                  <MonitorOff className="h-5 w-5" />
                ) : (
                  <Monitor className="h-5 w-5" />
                )}
              </ControlButton>
            )}

            {/* Speaker */}
            <ControlButton
              label={speakerEnabled ? "Mute speaker" : "Unmute speaker"}
              pressed={!speakerEnabled}
              onClick={toggleSpeaker}
            >
              {speakerEnabled ? (
                <Volume2 className="h-5 w-5" />
              ) : (
                <VolumeX className="h-5 w-5" />
              )}
            </ControlButton>

            {/* End Call - Larger and destructive */}
            <ControlButton 
              label="End call" 
              destructive 
              size="lg"
              onClick={handleEnd}
            >
              <Phone className="h-6 w-6 rotate-[135deg]" />
            </ControlButton>
          </div>

          {/* Reconnecting indicator */}
          {isReconnecting && (
            <div className="mt-3 flex items-center justify-center gap-2 text-yellow-500">
              <LoaderCircle className="h-4 w-4 animate-spin" />
              <span className="text-xs font-medium">Reconnecting...</span>
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
