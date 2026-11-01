"use client";

import { useState } from "react";
import { StarIcon } from "@/components/StarIcon";
import { MAX_STARS, STAR_UNIT, starsFor } from "@/lib/track-group";

/** Click star N to rate N×100 (click your current top star to clear).
 *  Double-click to type an exact integer — e.g. 501 bubbles a favorite above
 *  the other 5-star groups without changing what's displayed. */
export function StarRating({
  rating,
  onChange,
}: {
  rating: number;
  onChange: (rating: number) => void;
}) {
  const [typing, setTyping] = useState(false);
  const [value, setValue] = useState("");
  const shown = starsFor(rating);

  if (typing) {
    const commit = () => {
      const n = Math.round(Number(value));
      if (Number.isFinite(n) && n >= 0) onChange(n);
      setTyping(false);
    };
    return (
      <input
        autoFocus
        type="number"
        min={0}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") setTyping(false);
        }}
        aria-label="Exact rating"
        className="rb-input w-20 py-0.5 text-xs"
      />
    );
  }

  return (
    <span
      className="rb-stars"
      title={rating ? `Your rating: ${rating}` : "Not rated"}
      onDoubleClick={() => {
        setValue(String(rating || ""));
        setTyping(true);
      }}
    >
      {Array.from({ length: MAX_STARS }, (_, i) => {
        const n = i + 1;
        return (
          <button
            key={n}
            type="button"
            aria-label={`Rate ${n} star${n === 1 ? "" : "s"}`}
            onClick={(e) => {
              // 2nd click of a double-click belongs to onDoubleClick
              if (e.detail > 1) return;
              onChange(n === shown ? 0 : n * STAR_UNIT);
            }}
            className={n <= shown ? "rb-star rb-star-on" : "rb-star"}
          >
            <StarIcon />
          </button>
        );
      })}
    </span>
  );
}
