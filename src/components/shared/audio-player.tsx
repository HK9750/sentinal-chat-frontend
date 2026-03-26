'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AudioPlayerProps {
  src: string;
  duration?: number;
  onPlay?: () => void;
  className?: string;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function createWaveformBars(seed: string, length = 32): number[] {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }

  const values: number[] = [];
  let current = hash || 1;
  for (let index = 0; index < length; index += 1) {
    current = (1664525 * current + 1013904223) >>> 0;
    values.push(0.3 + (current / 0xffffffff) * 0.7);
  }

  return values;
}

function clampPercentage(value: number): number {
  if (Number.isNaN(value)) {
    return 0;
  }

  if (value < 0) {
    return 0;
  }

  if (value > 1) {
    return 1;
  }

  return value;
}

export function AudioPlayer({ src, duration, onPlay, className }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(duration ?? 0);
  const [hasPlayed, setHasPlayed] = useState(false);

  const waveformBars = useMemo(() => createWaveformBars(src), [src]);

  const progress = audioDuration > 0 ? (currentTime / audioDuration) * 100 : 0;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => setAudioDuration(audio.duration);
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
    };
  }, []);

  const togglePlayPause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      if (!hasPlayed) {
        setHasPlayed(true);
        onPlay?.();
      }
      void audio.play();
    }
  }, [isPlaying, hasPlayed, onPlay]);

  const handleSeek = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || audioDuration === 0) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const percentage = clampPercentage(x / rect.width);
    audio.currentTime = percentage * audioDuration;
  }, [audioDuration]);

  const handleSeekWithKeyboard = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      const audio = audioRef.current;
      if (!audio || audioDuration === 0) {
        return;
      }

      const smallStep = Math.min(5, Math.max(1, Math.round(audioDuration * 0.02)));
      const largeStep = Math.min(10, Math.max(3, Math.round(audioDuration * 0.1)));

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        audio.currentTime = Math.max(0, audio.currentTime - smallStep);
        return;
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        audio.currentTime = Math.min(audioDuration, audio.currentTime + smallStep);
        return;
      }

      if (event.key === 'PageDown') {
        event.preventDefault();
        audio.currentTime = Math.max(0, audio.currentTime - largeStep);
        return;
      }

      if (event.key === 'PageUp') {
        event.preventDefault();
        audio.currentTime = Math.min(audioDuration, audio.currentTime + largeStep);
        return;
      }

      if (event.key === 'Home') {
        event.preventDefault();
        audio.currentTime = 0;
        return;
      }

      if (event.key === 'End') {
        event.preventDefault();
        audio.currentTime = audioDuration;
      }
    },
    [audioDuration]
  );

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <audio ref={audioRef} src={src} preload="metadata" />

      {/* Play/Pause button */}
      <Button
        type="button"
        variant="secondary"
        size="icon"
        onClick={togglePlayPause}
        className="size-10 shrink-0 rounded-full"
        aria-label={isPlaying ? 'Pause audio' : 'Play audio'}
      >
        {isPlaying ? (
          <Pause className="size-4" />
        ) : (
          <Play className="size-4 translate-x-0.5" />
        )}
      </Button>

      {/* Waveform visualization */}
      <div className="flex flex-1 flex-col gap-1">
        <div
          className="flex h-8 cursor-pointer items-center gap-0.5"
          onClick={handleSeek}
          role="slider"
          aria-label="Audio progress"
          aria-valuemin={0}
          aria-valuemax={audioDuration}
          aria-valuenow={currentTime}
          aria-valuetext={`${formatDuration(currentTime)} of ${formatDuration(audioDuration)}`}
          tabIndex={0}
          onKeyDown={handleSeekWithKeyboard}
        >
          {waveformBars.map((height, index) => {
            const barProgress = (index / waveformBars.length) * 100;
            const isActive = barProgress <= progress;

            return (
              <div
                key={index}
                className={cn(
                  'flex-1 rounded-full transition-colors',
                  isActive ? 'bg-primary' : 'bg-muted-foreground/30'
                )}
                style={{ height: `${height * 100}%` }}
              />
            );
          })}
        </div>

        {/* Duration display */}
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>{formatDuration(currentTime)}</span>
          <span>{formatDuration(audioDuration)}</span>
        </div>
      </div>
    </div>
  );
}
