"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { AssetsLoadKind } from "@/components/AssetPicker";
import { type PlayerTrack, usePlayer } from "@/components/PlayerProvider";
import { SongChip } from "@/components/SongChip";
import { assetClass, driveDocKind } from "@/lib/asset";
import { tagBgClass, tagClass } from "@/lib/tag";
import type {
  Asset,
  AssetLink,
  CatalogEntry,
  Note,
  Song,
  TrackGroup,
} from "@/types";

function AssetLinksSection({
  label,
  links,
  assetsById,
  assetsLoad,
  onRetry,
}: {
  label: string;
  links: AssetLink[];
  assetsById: Map<string, Asset>;
  assetsLoad: AssetsLoadKind;
  onRetry: () => void;
}) {
  if (links.length === 0) return null;
  return (
    <div className="border-t border-neutral-800 pt-4">
      <div className="mb-2 flex items-center justify-between">
        <p className={`rb-label`}>{label}</p>
        {assetsLoad === "error" && (
          <button type="button" onClick={onRetry} className={"rb-nav-link"}>
            Retry
          </button>
        )}
      </div>
      <div className="space-y-1.5">
        {links.map((link) => {
          if (assetsLoad === "loading") {
            return (
              <p key={link.linkId} className={"tg-meta"}>
                loading…
              </p>
            );
          }
          if (assetsLoad === "error") {
            return (
              <p key={link.linkId} className={"rb-text-error"}>
                load failed
              </p>
            );
          }
          const asset = assetsById.get(link.assetId);
          if (!asset) {
            return (
              <p key={link.linkId} className={"rb-text-error font-mono"}>
                missing: {link.assetId}
              </p>
            );
          }
          const kind = driveDocKind(asset.url);
          return (
            <a
              key={link.linkId}
              href={asset.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-2"
            >
              <span
                className={`shrink-0 rounded border px-1.5 py-0.5 text-xs tracking-wider uppercase ${assetClass(asset.subtype)}`}
              >
                {asset.subtype}
              </span>
              <span className={"tg-asset-link"}>{asset.title}</span>
              <span className={"tg-meta shrink-0"}>
                {asset.type}
                {kind ? `·${kind}` : ""}
              </span>
            </a>
          );
        })}
      </div>
    </div>
  );
}

/** Shows real tags labeled "Tag Chips:", or — only when there are none yet —
 * the legacy stage value labeled "Stage Chips:" so it's clear which kind of
 * data is being shown, not a silent merge of the two. */
function LabeledTags({
  tags,
  stage,
  className,
}: {
  tags?: string[];
  stage?: string;
  className?: string;
}) {
  const hasTags = !!tags && tags.length > 0;
  const legacyStage = !hasTags && stage && stage !== "unknown" ? stage : null;
  if (!hasTags && !legacyStage) return null;

  return (
    <div className={`flex flex-wrap items-center gap-1 ${className ?? ""}`}>
      <span className="text-xs text-neutral-600">
        {hasTags ? "Tag Chips:" : "Stage Chips:"}
      </span>
      {hasTags
        ? tags?.map((tag) => (
            <span
              key={tag}
              className={`inline-block rounded border px-1 py-0 text-xs ${tagClass(tag, "track")} ${tagBgClass(tag, "track")}`}
            >
              {tag}
            </span>
          ))
        : legacyStage && (
            <span
              title="Legacy stage value — not yet migrated to a tag"
              className="inline-block rounded border border-dashed border-neutral-700 px-1 py-0 text-xs text-neutral-500"
            >
              {legacyStage}
            </span>
          )}
    </div>
  );
}

function TrackPlayer({
  queue,
  queueIndex,
}: {
  queue: PlayerTrack[];
  queueIndex: number;
}) {
  const player = usePlayer();
  const current = queue[queueIndex];
  const isCurrent = current && player.track?.path === current.path;
  const playing = isCurrent && player.isPlaying;
  const progress = isCurrent ? player.currentTime : 0;
  const duration = isCurrent ? player.duration : 0;

  const onPlayClick = () => {
    if (isCurrent) {
      player.toggle();
    } else {
      // Loads the whole track-group as a queue starting at this index; autoPlay attr kicks playback.
      // When this track ends, the player auto-advances to the next one in the group.
      player.setQueue(queue, queueIndex);
    }
  };

  const onSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isCurrent || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    player.seek(((e.clientX - rect.left) / rect.width) * duration);
  };

  const fmt = (s: number) =>
    `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <button onClick={onPlayClick} className={"rb-player-play"}>
          {playing ? "❚❚" : "▶"}
        </button>
        <div className="rb-player-track mt-0 flex-1" onClick={onSeek}>
          <div
            className={"rb-player-fill"}
            style={{
              width: duration ? `${(progress / duration) * 100}%` : "0%",
            }}
          />
        </div>
        <span className={"rb-player-time"}>
          {fmt(progress)} / {fmt(duration)}
        </span>
      </div>
    </div>
  );
}

function NoteThread({
  trackGroupId,
  trackPath,
}: {
  trackGroupId: string;
  trackPath: string;
}) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(
      `/api/track-groups/${trackGroupId}/notes?track=${encodeURIComponent(trackPath)}`,
    )
      .then((r) => r.json())
      .then(setNotes);
  }, [trackGroupId, trackPath]);

  const submit = async (e: React.SubmitEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    setLoading(true);
    const res = await fetch(`/api/track-groups/${trackGroupId}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: text.trim(), trackPath }),
    });
    const note = await res.json();
    setNotes((prev) => [...prev, note]);
    setText("");
    setLoading(false);
  };

  return (
    <div className="mt-4 space-y-3">
      {notes.map((note) => (
        <div key={note.id} className="text-sm">
          <span className={"tg-note-author"}>{note.author.split("@")[0]}</span>
          <span className={"tg-meta ml-2"}>
            {new Date(note.createdAt).toLocaleString()}
          </span>
          <p className={"tg-note-body"}>{note.text}</p>
        </div>
      ))}
      <form onSubmit={submit} className="flex gap-2 pt-1">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Add a note..."
          className={"rb-input flex-1"}
        />
        <button
          type="submit"
          disabled={loading || !text.trim()}
          className={"rb-btn-secondary"}
        >
          Post
        </button>
      </form>
    </div>
  );
}

export default function TrackGroupPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [trackGroup, setTrackGroup] = useState<TrackGroup | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [assetsLoad, setAssetsLoad] = useState<AssetsLoadKind>("loading");
  const [activeTrack, setActiveTrack] = useState<string | null>(null);
  const [trackGroupId, setTrackGroupId] = useState<string>("");
  const [catalog, setCatalog] = useState<CatalogEntry[]>([]);
  const [songs, setSongs] = useState<Song[]>([]);
  const detailRef = useRef<HTMLDivElement>(null);

  // Single-column below md: the detail panel sits under the tracklist, so
  // bring it into view when a track is picked.
  const selectTrack = (path: string) => {
    setActiveTrack(path);
    if (window.matchMedia("(min-width: 768px)").matches) return;
    requestAnimationFrame(() =>
      detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
  };

  const fetchAssets = useCallback(async () => {
    try {
      const res = await fetch("/api/assets");
      if (!res.ok) throw new Error(`Failed to load: ${res.status}`);
      setAssets(await res.json());
      setAssetsLoad("loaded");
    } catch {
      setAssetsLoad("error");
    }
  }, []);

  const retryAssets = useCallback(() => {
    setAssetsLoad("loading");
    fetchAssets();
  }, [fetchAssets]);

  useEffect(() => {
    params.then(async ({ id }) => {
      setTrackGroupId(id);
      const rRel = await fetch("/api/track-groups");
      const trackGroups: TrackGroup[] = await rRel.json();
      const found = trackGroups.find((r) => r.id === id);
      if (found) {
        setTrackGroup(found);
        if (found.tracks.length > 0) setActiveTrack(found.tracks[0].path);
      }
    });
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot fetch on mount; setState fires after await
    fetchAssets();
    fetch("/api/catalog")
      .then((r) => r.json())
      .then(setCatalog)
      .catch(() => {});
    fetch("/api/songs")
      .then((r) => r.json())
      .then(setSongs)
      .catch(() => {});
  }, [params, fetchAssets]);

  if (!trackGroup) {
    return <p className={"text-gradient-mistpurple text-sm"}>Loading...</p>;
  }

  const validTracks = trackGroup.tracks.filter((t) => t.path?.trim());
  const active = validTracks.find((t) => t.path === activeTrack);
  const assetsById = new Map(assets.map((a) => [a.id, a]));
  // Track (embedded in TrackGroup) has no songId of its own — derive song
  // ownership the same way Browse does, by joining on path via the catalog.
  const songsById = new Map(songs.map((s) => [s.id, s]));
  const songNameByPath = new Map(
    catalog
      .filter((e) => e.songId)
      .map((e) => [e.path, songsById.get(e.songId as string)?.name]),
  );

  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <Link href="/" className={`rb-nav-link`}>
            ← TrackGroups
          </Link>
          <Link href={`/admin/${trackGroupId}`} className={`rb-nav-link`}>
            Edit
          </Link>
        </div>
        <h1 className={"tg-title mt-2"}>{trackGroup.title}</h1>
        {trackGroup.description && (
          <p className={"text-gradient-mistpurple mt-1 text-sm"}>
            {trackGroup.description}
          </p>
        )}
        <p className={"tg-meta mt-2"}>
          {new Date(trackGroup.createdAt).toLocaleDateString()}
        </p>
      </div>

      <div className="tg-layout">
        {/* Tracklist */}
        <div className="space-y-1">
          <p className={`rb-label mb-3`}>Tracks</p>
          {validTracks.map((track, i) => (
            <button
              key={track.path}
              onClick={() => selectTrack(track.path)}
              className={`tg-track-row ${activeTrack === track.path ? "tg-track-row-active" : ""}`}
            >
              <span className={"tg-meta mt-0.5 w-4 shrink-0 tabular-nums"}>
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm">{track.title}</div>
                <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                  {songNameByPath.get(track.path) && (
                    <SongChip
                      name={songNameByPath.get(track.path) as string}
                      size="sm"
                    />
                  )}
                  <LabeledTags tags={track.tags} stage={track.stage} />
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Player + Notes */}
        <div>
          {active && (
            <div ref={detailRef} className="tg-detail">
              <div>
                <h2 className={"tg-title text-lg"}>{active.title}</h2>
                <LabeledTags
                  tags={active.tags}
                  stage={active.stage}
                  className="mt-1"
                />
              </div>
              <TrackPlayer
                key={active.path}
                queue={validTracks.map((t) => ({
                  path: t.path,
                  title: t.title,
                  subtitle: trackGroup.title,
                }))}
                queueIndex={validTracks.findIndex(
                  (t) => t.path === active.path,
                )}
              />
              <div className="border-t border-neutral-800 pt-4">
                <p className={`rb-label mb-3`}>Notes</p>
                <NoteThread
                  trackGroupId={trackGroupId}
                  trackPath={active.path}
                />
              </div>

              <AssetLinksSection
                label="Documents & links"
                links={active.assets ?? []}
                assetsById={assetsById}
                assetsLoad={assetsLoad}
                onRetry={retryAssets}
              />
              <AssetLinksSection
                label="Track group documents & links"
                links={trackGroup.assets ?? []}
                assetsById={assetsById}
                assetsLoad={assetsLoad}
                onRetry={retryAssets}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
