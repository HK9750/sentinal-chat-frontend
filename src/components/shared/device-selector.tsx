'use client';

import { useCallback, useEffect, useState } from 'react';
import { Camera, Check, Mic, Settings, Speaker } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import {
  getDevicesByKind,
  watchMediaDevices,
  type MediaDeviceInfo,
} from '@/services/call-service';
import { useCallStore } from '@/stores/call-store';
import { useWebRtc } from '@/hooks/use-webrtc';

interface DeviceSelectorProps {
  className?: string;
  showLabels?: boolean;
  triggerVariant?: 'icon' | 'button';
}

export function DeviceSelector({
  className,
  showLabels = false,
  triggerVariant = 'icon',
}: DeviceSelectorProps) {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  
  const setAvailableDevices = useCallStore((state) => state.setAvailableDevices);
  const selectedAudioInput = useCallStore((state) => state.selectedAudioInput);
  const selectedVideoInput = useCallStore((state) => state.selectedVideoInput);
  const selectedAudioOutput = useCallStore((state) => state.selectedAudioOutput);
  const setSelectedAudioInput = useCallStore((state) => state.setSelectedAudioInput);
  const setSelectedVideoInput = useCallStore((state) => state.setSelectedVideoInput);
  const setSelectedAudioOutput = useCallStore((state) => state.setSelectedAudioOutput);
  
  const { switchCamera, switchMicrophone } = useWebRtc();

  // Watch for device changes
  useEffect(() => {
    const unsubscribe = watchMediaDevices((newDevices) => {
      setDevices(newDevices);
      setAvailableDevices(
        newDevices.map((d) => ({
          deviceId: d.deviceId,
          label: d.label,
          kind: d.kind,
        }))
      );
    });

    return unsubscribe;
  }, [setAvailableDevices]);

  const audioInputs = getDevicesByKind(devices, 'audioinput');
  const videoInputs = getDevicesByKind(devices, 'videoinput');
  const audioOutputs = getDevicesByKind(devices, 'audiooutput');

  const handleSelectAudioInput = useCallback(
    async (deviceId: string) => {
      setSelectedAudioInput(deviceId);
      await switchMicrophone(deviceId);
    },
    [setSelectedAudioInput, switchMicrophone]
  );

  const handleSelectVideoInput = useCallback(
    async (deviceId: string) => {
      setSelectedVideoInput(deviceId);
      await switchCamera(deviceId);
    },
    [setSelectedVideoInput, switchCamera]
  );

  const handleSelectAudioOutput = useCallback(
    async (deviceId: string) => {
      setSelectedAudioOutput(deviceId);
      // Note: Setting audio output requires HTMLMediaElement.setSinkId()
      // which would need to be called on the audio/video elements
    },
    [setSelectedAudioOutput]
  );

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        {triggerVariant === 'icon' ? (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className={cn('h-9 w-9 rounded-full', className)}
            aria-label="Device settings"
          >
            <Settings className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            className={cn('gap-2', className)}
            aria-label="Device settings"
          >
            <Settings className="h-4 w-4" />
            {showLabels && 'Settings'}
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-4 pb-2">
          <h4 className="font-semibold">Device Settings</h4>
          <p className="text-xs text-muted-foreground">
            Select your camera, microphone, and speaker
          </p>
        </div>
        
        <ScrollArea className="h-[320px]">
          <div className="space-y-4 p-4 pt-2">
            {/* Microphone Selection */}
            {audioInputs.length > 0 && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-sm font-medium">
                  <Mic className="h-4 w-4 text-muted-foreground" />
                  Microphone
                </Label>
                <div className="space-y-1">
                  {audioInputs.map((device) => (
                    <button
                      key={device.deviceId}
                      onClick={() => handleSelectAudioInput(device.deviceId)}
                      className={cn(
                        'flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm',
                        'hover:bg-accent hover:text-accent-foreground',
                        'transition-colors',
                        (selectedAudioInput === device.deviceId ||
                          (!selectedAudioInput && device === audioInputs[0])) &&
                          'bg-accent/50'
                      )}
                    >
                      <span className="truncate">{device.label}</span>
                      {(selectedAudioInput === device.deviceId ||
                        (!selectedAudioInput && device === audioInputs[0])) && (
                        <Check className="h-4 w-4 shrink-0 text-primary" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Camera Selection */}
            {videoInputs.length > 0 && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-sm font-medium">
                  <Camera className="h-4 w-4 text-muted-foreground" />
                  Camera
                </Label>
                <div className="space-y-1">
                  {videoInputs.map((device) => (
                    <button
                      key={device.deviceId}
                      onClick={() => handleSelectVideoInput(device.deviceId)}
                      className={cn(
                        'flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm',
                        'hover:bg-accent hover:text-accent-foreground',
                        'transition-colors',
                        (selectedVideoInput === device.deviceId ||
                          (!selectedVideoInput && device === videoInputs[0])) &&
                          'bg-accent/50'
                      )}
                    >
                      <span className="truncate">{device.label}</span>
                      {(selectedVideoInput === device.deviceId ||
                        (!selectedVideoInput && device === videoInputs[0])) && (
                        <Check className="h-4 w-4 shrink-0 text-primary" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Speaker Selection */}
            {audioOutputs.length > 0 && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-sm font-medium">
                  <Speaker className="h-4 w-4 text-muted-foreground" />
                  Speaker
                </Label>
                <div className="space-y-1">
                  {audioOutputs.map((device) => (
                    <button
                      key={device.deviceId}
                      onClick={() => handleSelectAudioOutput(device.deviceId)}
                      className={cn(
                        'flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm',
                        'hover:bg-accent hover:text-accent-foreground',
                        'transition-colors',
                        (selectedAudioOutput === device.deviceId ||
                          (!selectedAudioOutput && device === audioOutputs[0])) &&
                          'bg-accent/50'
                      )}
                    >
                      <span className="truncate">{device.label}</span>
                      {(selectedAudioOutput === device.deviceId ||
                        (!selectedAudioOutput && device === audioOutputs[0])) && (
                        <Check className="h-4 w-4 shrink-0 text-primary" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {audioInputs.length === 0 &&
              videoInputs.length === 0 &&
              audioOutputs.length === 0 && (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  <Settings className="mx-auto mb-2 h-8 w-8 opacity-50" />
                  <p>No devices found</p>
                  <p className="text-xs">
                    Please grant permission to access your devices
                  </p>
                </div>
              )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

// Compact dropdown version for use in call controls
interface DeviceDropdownProps {
  type: 'audio' | 'video';
  className?: string;
}

export function DeviceDropdown({ type, className }: DeviceDropdownProps) {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  
  const selectedAudioInput = useCallStore((state) => state.selectedAudioInput);
  const selectedVideoInput = useCallStore((state) => state.selectedVideoInput);
  const setSelectedAudioInput = useCallStore((state) => state.setSelectedAudioInput);
  const setSelectedVideoInput = useCallStore((state) => state.setSelectedVideoInput);
  
  const { switchCamera, switchMicrophone } = useWebRtc();

  useEffect(() => {
    const unsubscribe = watchMediaDevices(setDevices);
    return unsubscribe;
  }, []);

  const deviceList =
    type === 'audio'
      ? getDevicesByKind(devices, 'audioinput')
      : getDevicesByKind(devices, 'videoinput');

  const selectedId = type === 'audio' ? selectedAudioInput : selectedVideoInput;

  const handleSelect = useCallback(
    async (deviceId: string) => {
      if (type === 'audio') {
        setSelectedAudioInput(deviceId);
        await switchMicrophone(deviceId);
      } else {
        setSelectedVideoInput(deviceId);
        await switchCamera(deviceId);
      }
    },
    [type, setSelectedAudioInput, setSelectedVideoInput, switchCamera, switchMicrophone]
  );

  if (deviceList.length <= 1) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className={cn(
            'h-6 w-6 rounded-full bg-black/40 hover:bg-black/60',
            className
          )}
        >
          <span className="sr-only">Select {type}</span>
          <svg
            className="h-3 w-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" className="w-64">
        <DropdownMenuLabel>
          {type === 'audio' ? 'Select Microphone' : 'Select Camera'}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          {deviceList.map((device) => (
            <DropdownMenuItem
              key={device.deviceId}
              onClick={() => handleSelect(device.deviceId)}
              className="justify-between"
            >
              <span className="truncate">{device.label}</span>
              {(selectedId === device.deviceId ||
                (!selectedId && device === deviceList[0])) && (
                <Check className="h-4 w-4 shrink-0" />
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
