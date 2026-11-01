"use client";

import Link from "next/link";
import { useState } from "react";
import { StarRating } from "@/components/StarRating";
import { TagChips } from "@/components/TagChips";
import { tagBgClass, tagClass, tagSuggestions } from "@/lib/tag";
import { isActive, ratingOf, sortTrackGroups } from "@/lib/track-group";
import type { TrackGroup } from "@/types";

/** null clears an optional field server-side. */
type Patch = { [K in keyof TrackGroup]?: TrackGroup[K] | null };

/** Track tags (or legacy stage when untagged) rolled up across the group. */
function TrackChips({ tracks }: { tracks: TrackGroup["tracks"] }) {
  const tagChips = [...new Set(tracks.flatMap((t) => t.tags ?? []))];
  const stageChips = [
    ...new Set(
      tracks
        .filter((t) => !t.tags || t.tags.length === 0)
        .map((t) => t.stage)
        .filter((s): s is string => !!s && s !== "unknown"),
    ),
  ];
  return (
    <>
      {tagChips.length > 0 && (
        <div className="ml-1 flex items-center gap-1.5">
          <span className="tg-chip-label">Tag Chips:</span>
          {tagChips.map((tag) => (
            <span
              key={tag}
              className={`tg-chip ${tagClass(tag, "track")} ${tagBgClass(tag, "track")}`}
            >
              {tag}
            </span>
          ))}
        </div>
      )}
      {stageChips.length > 0 && (
        <div className="ml-1 flex items-center gap-1.5">
          <span className="tg-chip-label">Stage Chips:</span>
          {stageChips.map((stage) => (
            <span
              key={stage}
              title="Legacy stage value — not yet migrated to a tag"
              className="tg-chip tg-chip-legacy"
            >
              {stage}
            </span>
          ))}
        </div>
      )}
    </>
  );
}

function EditIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 48 48"
      height="48"
      width="48"
      aria-hidden
    >
      <path
        fill="url(#tg-edit-gradient)"
        fillRule="evenodd"
        d="M34.4888 2.4814C36.051.91925 38.4294.226574 40.4035 1.53742c.9551.63429 2.0811 1.51975 3.31 2.74871 1.229 1.22896 2.1145 2.3549 2.7487 3.31006 1.3109 1.97404.6182 4.35251-.9439 5.91461l-1.9342 1.9342c-.0606-.1198-.1251-.2438-.1937-.3717-.8143-1.5177-2.2058-3.5826-4.5436-5.92044-2.3378-2.3378-4.4027-3.72925-5.9204-4.54362-.1279-.06863-.2519-.13312-.3717-.1937l1.9341-1.93414Zm-4.1971 4.19731c.3067.12251.7177.30619 1.2166.57389 1.2583.67521 3.0866 1.89052 5.2175 4.0215 2.131 2.1309 3.3463 3.9592 4.0215 5.2175.2677.4989.4514.9099.5739 1.2165L26.8024 32.2268c-.6113.6113-1.4045 1.0474-2.3047 1.1343-1.3289.1283-3.7833.2436-7.5749-.0216-1.2118-.0848-2.1776-1.0506-2.2624-2.2624-.2652-3.7917-.1499-6.2461-.0216-7.5749.0869-.9003.523-1.6935 1.1343-2.3048L30.2917 6.67871ZM16.7134 36.3324c3.9416.2757 6.5632.1608 8.0726.0151 1.7082-.1649 3.1228-.9842 4.1377-1.9991l16.1747-16.1747C45.6853 20.1806 46 22.3035 46 24.5 46 36.9264 35.9264 47 23.5 47S1 36.9264 1 24.5 11.0736 2 23.5 2c2.1965 0 4.3196.31475 6.3264.90162L13.6517 19.0764c-1.0149 1.0149-1.8341 2.4295-1.9991 4.1377-.1457 1.5094-.2606 4.131.0151 8.0726.1891 2.7036 2.3421 4.8566 5.0457 5.0457Z"
        clipRule="evenodd"
      />
      <defs>
        <linearGradient
          id="tg-edit-gradient"
          x1="51.152"
          x2="-11.101"
          y1="56.776"
          y2="12.555"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#ffd600" />
          <stop offset="1" stopColor="#ff007a" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function TrackGroupCard({
  tg,
  viewer,
  suggestions,
  onPatch,
  onRate,
}: {
  tg: TrackGroup;
  viewer: string | null;
  suggestions: string[];
  onPatch: (patch: Patch) => void;
  onRate: (rating: number) => void;
}) {
  const active = isActive(tg);
  const tracks = tg.tracks.filter((t) => t.path?.trim());
  const tags = tg.tags ?? [];
  return (
    <div
      className={active ? "tg-card group" : "tg-card tg-card-inactive group"}
    >
      <div className="flex items-start gap-4">
        <Link
          href={`/track-group/${tg.id}`}
          className="min-w-0 flex-1 p-5 pb-2"
        >
          <h2 className="tg-card-title">
            {tg.pinned && (
              // biome-ignore lint/performance/noImgElement: 16px static logo
              <img src="/rb256.png" alt="Pinned" className="tg-pin-icon" />
            )}
            {tg.title}
          </h2>
          {tg.description && (
            <p className="text-gradient-brand mt-1 line-clamp-2 text-sm">
              {tg.description}
            </p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <span className="tg-meta">
              {tracks.length} track{tracks.length !== 1 ? "s" : ""}
            </span>
            <span className="tg-meta">·</span>
            <span className="tg-meta">
              {new Date(tg.createdAt).toLocaleDateString()}
            </span>
            <TrackChips tracks={tracks} />
          </div>
        </Link>
        <Link href={`/admin/${tg.id}`} className="tg-card-edit">
          <EditIcon /> Edit
        </Link>
      </div>
      <div className="tg-card-controls">
        {viewer && (
          <StarRating rating={ratingOf(tg, viewer)} onChange={onRate} />
        )}
        <TagChips
          tags={tags}
          entityType="track-group"
          suggestions={suggestions}
          listId={`tg-tags-${tg.id}`}
          onAdd={(t) => !tags.includes(t) && onPatch({ tags: [...tags, t] })}
          onRemove={(t) => onPatch({ tags: tags.filter((x) => x !== t) })}
        />
        <span className="ml-auto flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onPatch({ active: tg.active === false })}
            className={
              tg.active === false ? "rb-toggle" : "rb-toggle rb-toggle-on"
            }
            title={active ? "Active" : "Inactive — sorted to the bottom"}
          >
            {tg.active === false ? "Inactive" : "Active"}
          </button>
          <label className="tg-meta flex items-center gap-1">
            until
            <input
              type="date"
              value={tg.activeUntil ?? ""}
              onChange={(e) => onPatch({ activeUntil: e.target.value || null })}
              className="rb-input w-auto py-0.5 text-xs"
            />
          </label>
          <button
            type="button"
            onClick={() => onPatch({ pinned: !tg.pinned })}
            className={tg.pinned ? "rb-toggle rb-toggle-on" : "rb-toggle"}
            title="Pinned groups show in Band Pinned on the home page"
          >
            {tg.pinned ? "Pinned" : "Pin"}
          </button>
        </span>
      </div>
    </div>
  );
}

/** Track groups sorted active → your stars → newest; ratings, tags, active
 *  and pin are all editable in place and re-sort immediately. */
export function TrackGroupList({
  initial,
  viewer,
}: {
  initial: TrackGroup[];
  viewer: string | null;
}) {
  const [groups, setGroups] = useState(initial);
  const [error, setError] = useState("");

  const replace = (id: string, next: Partial<TrackGroup>) =>
    setGroups((gs) => gs.map((g) => (g.id === id ? { ...g, ...next } : g)));

  const send = async (url: string, body: object) => {
    setError("");
    const res = await fetch(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok)
      setError(`Save failed (${res.status}) — reload to see current data.`);
  };

  const patch = (id: string, p: Patch) => {
    // locally, a cleared field is just unset
    replace(
      id,
      Object.fromEntries(
        Object.entries(p).map(([k, v]) => [k, v ?? undefined]),
      ),
    );
    send(`/api/track-groups/${id}`, p);
  };

  const rate = (id: string, rating: number) => {
    if (!viewer) return;
    const g = groups.find((x) => x.id === id);
    replace(id, { ratings: { ...g?.ratings, [viewer]: rating } });
    send(`/api/track-groups/${id}/rating`, { rating });
  };

  const suggestions = tagSuggestions(
    "track-group",
    groups.flatMap((g) => g.tags ?? []),
  );

  return (
    <div className="space-y-4">
      {error && <p className="rb-text-error">{error}</p>}
      {sortTrackGroups(groups, viewer).map((tg) => (
        <TrackGroupCard
          key={tg.id}
          tg={tg}
          viewer={viewer}
          suggestions={suggestions}
          onPatch={(p) => patch(tg.id, p)}
          onRate={(r) => rate(tg.id, r)}
        />
      ))}
    </div>
  );
}
