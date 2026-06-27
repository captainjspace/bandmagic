"use client";

import { createContext, useContext, useRef, useState, useCallback, type ReactNode } from "react";

export type PlayerTrack = {
  path: string;
  title: string;
  subtitle?: string;
};

type PlayerContextValue = {
  track: PlayerTrack | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  queue: PlayerTrack[];
  queueIndex: number;
  hasNext: boolean;
  hasPrev: boolean;
  setTrack: (t: PlayerTrack | null) => void;
  setQueue: (tracks: PlayerTrack[], startIndex?: number) => void;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  seek: (time: number) => void;
  next: () => void;
  prev: () => void;
  stop: () => void;
};

const PlayerContext = createContext<PlayerContextValue | null>(null);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [track, setTrackState] = useState<PlayerTrack | null>(null);
  const [queue, setQueueState] = useState<PlayerTrack[]>([]);
  const [queueIndex, setQueueIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const hasNext = queue.length > 0 && queueIndex + 1 < queue.length;
  const hasPrev = queue.length > 0 && queueIndex > 0;

  const setTrack = useCallback((t: PlayerTrack | null) => {
    setTrackState(t);
    setQueueState(t ? [t] : []);
    setQueueIndex(0);
    setCurrentTime(0);
    setDuration(0);
  }, []);

  const setQueue = useCallback((tracks: PlayerTrack[], startIndex: number = 0) => {
    if (tracks.length === 0) {
      setQueueState([]);
      setTrackState(null);
      setQueueIndex(0);
    } else {
      const i = Math.max(0, Math.min(startIndex, tracks.length - 1));
      setQueueState(tracks);
      setQueueIndex(i);
      setTrackState(tracks[i]);
    }
    setCurrentTime(0);
    setDuration(0);
  }, []);

  const play = useCallback(() => { void audioRef.current?.play(); }, []);
  const pause = useCallback(() => { audioRef.current?.pause(); }, []);
  const toggle = useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) void a.play(); else a.pause();
  }, []);

  const seek = useCallback((time: number) => {
    const a = audioRef.current;
    if (!a || !isFinite(time)) return;
    a.currentTime = time;
    setCurrentTime(time);
  }, []);

  const advance = useCallback((delta: 1 | -1) => {
    setQueueIndex(i => {
      const next = i + delta;
      if (next < 0 || next >= queue.length) return i;
      setTrackState(queue[next]);
      setCurrentTime(0);
      setDuration(0);
      return next;
    });
  }, [queue]);

  const next = useCallback(() => { advance(1); }, [advance]);
  const prev = useCallback(() => { advance(-1); }, [advance]);

  const stop = useCallback(() => {
    audioRef.current?.pause();
    setTrackState(null);
    setQueueState([]);
    setQueueIndex(0);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  }, []);

  const onTrackEnded = useCallback(() => {
    if (hasNext) advance(1);
    else setIsPlaying(false);
  }, [hasNext, advance]);

  return (
    <PlayerContext.Provider value={{
      track, isPlaying, currentTime, duration,
      queue, queueIndex, hasNext, hasPrev,
      setTrack, setQueue, play, pause, toggle, seek, next, prev, stop,
    }}>
      {children}
      {track && (
        <audio
          ref={audioRef}
          src={`/api/audio?path=${encodeURIComponent(track.path)}`}
          autoPlay
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime ?? 0)}
          onLoadedMetadata={() => setDuration(audioRef.current?.duration ?? 0)}
          onEnded={onTrackEnded}
        />
      )}
    </PlayerContext.Provider>
  );
}

export function usePlayer(): PlayerContextValue {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used within PlayerProvider");
  return ctx;
}
