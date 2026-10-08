"use client";

import { usePlayer } from "./PlayerProvider";

/** element colors */
const colors = {
  bar: "bg-neutral-950/90 backdrop-blur border-t border-neutral-800",
  title: "text-neutral-100",
  subtitle: "text-neutral-500",
  playBtn: "bg-green-500 hover:bg-green-400 text-black",
  stepBtn:
    "text-neutral-400 hover:text-neutral-100 disabled:opacity-30 disabled:hover:text-neutral-400",
  progress: "bg-green-500",
  progressBg: "bg-neutral-800",
  timestamp: "text-neutral-500",
  closeBtn: "text-neutral-600 hover:text-red-400",
};

const fmt = (s: number) =>
  `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

export function FooterPlayer() {
  const {
    track,
    isPlaying,
    currentTime,
    duration,
    queue,
    hasNext,
    hasPrev,
    toggle,
    seek,
    next,
    prev,
    stop,
  } = usePlayer();
  if (!track) return null;
  const showSteps = queue.length > 1;

  const onSeekClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    seek(((e.clientX - rect.left) / rect.width) * duration);
  };

  return (
    <div className={`fixed right-0 bottom-0 left-0 z-40 ${colors.bar}`}>
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-6 py-2.5">
        {showSteps && (
          <button
            onClick={prev}
            disabled={!hasPrev}
            aria-label="Previous track"
            className={`shrink-0 text-sm transition-colors ${colors.stepBtn}`}
          >
            ⏮
          </button>
        )}
        <button
          onClick={toggle}
          aria-label={isPlaying ? "Pause" : "Play"}
          className={`flex h-8 w-8 items-center justify-center rounded-full ${colors.playBtn} shrink-0 font-bold text-xs transition-colors`}
        >
          {isPlaying ? "❚❚" : "▶"}
        </button>
        {showSteps && (
          <button
            onClick={next}
            disabled={!hasNext}
            aria-label="Next track"
            className={`shrink-0 text-sm transition-colors ${colors.stepBtn}`}
          >
            ⏭
          </button>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className={`truncate text-sm ${colors.title}`}>
              {track.title}
            </span>
            {track.subtitle && (
              <span className={`truncate text-xs ${colors.subtitle}`}>
                {track.subtitle}
              </span>
            )}
          </div>
          <div
            className={`mt-1 h-1 cursor-pointer rounded-full ${colors.progressBg}`}
            onClick={onSeekClick}
          >
            <div
              className={`h-full rounded-full ${colors.progress} transition-all`}
              style={{
                width: duration ? `${(currentTime / duration) * 100}%` : "0%",
              }}
            />
          </div>
        </div>
        <span className={`text-xs ${colors.timestamp} shrink-0 tabular-nums`}>
          {fmt(currentTime)} / {fmt(duration)}
        </span>
        <button
          onClick={stop}
          aria-label="Stop and dismiss"
          className={`text-xs ${colors.closeBtn} shrink-0 transition-colors`}
        >
          ✕
        </button>
      </div>
    </div>
  );
}
