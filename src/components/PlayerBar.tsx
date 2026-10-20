"use client";

import { useState } from "react";
import { usePlayer } from "./PlayerProvider";

const fmt = (s: number) =>
  `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

/** The global player. Rendered twice, and CSS decides which one shows:
 *  - "header": below md, a collapsible 2nd-tier bar inside the sticky header,
 *    so page content scrolls under it.
 *  - "footer": md and up, the fixed bottom bar. */
export function PlayerBar({ placement }: { placement: "header" | "footer" }) {
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
  const [expanded, setExpanded] = useState(false);
  if (!track) return null;

  const compact = placement === "header" && !expanded;
  const showSteps = queue.length > 1 && !compact;

  const onSeekClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    seek(((e.clientX - rect.left) / rect.width) * duration);
  };

  const stepBtn = (dir: "prev" | "next") => (
    <button
      type="button"
      onClick={dir === "prev" ? prev : next}
      disabled={dir === "prev" ? !hasPrev : !hasNext}
      aria-label={dir === "prev" ? "Previous track" : "Next track"}
      className="rb-player-step"
    >
      {dir === "prev" ? "⏮" : "⏭"}
    </button>
  );

  return (
    <div className={`rb-player-${placement}`}>
      <div className="rb-player-row">
        {showSteps && stepBtn("prev")}
        <button
          type="button"
          onClick={toggle}
          aria-label={isPlaying ? "Pause" : "Play"}
          className="rb-player-play"
        >
          {isPlaying ? "❚❚" : "▶"}
        </button>
        {showSteps && stepBtn("next")}
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="rb-player-title">{track.title}</span>
            {track.subtitle && !compact && (
              <span className="rb-player-subtitle">{track.subtitle}</span>
            )}
          </div>
          <div className="rb-player-track" onClick={onSeekClick}>
            <div
              className="rb-player-fill"
              style={{
                width: duration ? `${(currentTime / duration) * 100}%` : "0%",
              }}
            />
          </div>
        </div>
        {!compact && (
          <span className="rb-player-time">
            {fmt(currentTime)} / {fmt(duration)}
          </span>
        )}
        {placement === "header" && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-label={expanded ? "Collapse player" : "Expand player"}
            aria-expanded={expanded}
            className="rb-player-icon-btn"
          >
            {expanded ? "▲" : "▼"}
          </button>
        )}
        {!compact && (
          <button
            type="button"
            onClick={stop}
            aria-label="Stop and dismiss"
            className="rb-player-icon-btn"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
