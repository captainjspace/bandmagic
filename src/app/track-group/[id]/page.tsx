"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
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

/** element colors */
const colors = {
  page: {
    title: "text-rbpurple-700",
    description:
      "inline-block text-transparent bg-clip-text bg-gradient-to-r from-rbmist-300 via-rbviolet-300 to-rbpurple-700",
    date: "text-rbpurple-300",
    navLink: "text-rbyellow-500 hover:text-rborange-500",
    sectionLabel: "text-rbblue-700",
  },
  tracklist: {
    number: "text-rbred-200",
    idle: "text-rb-yellow-200 hover:text-rb-rborange-200",
    active: "text-rborange-100",
  },
  trackPlayer: {
    playButton: "bg-green-500 hover:bg-green-400 text-black",
    progressFill: "fill-gradient-brand",
    timestamp: "text-rbblue-400",
  },
  noteThread: {
    author: "text-rbcyan-700",
    timestamp: "text-rbcyan-600",
    body: "text-cyan-500",
    inputText: "text-rbcyan-400",
    placeholder: "placeholder-rbviolet-700",
    focusBorder: "focus:border-rborange-600",
    postBtn: "text-rbyellow-400",
  },
  assets: {
    label: "text-rbblue-400",
    linkText: "text-green-400 group-hover:text-green-300",
    kindBadge: "text-rbred-600",
    loadingRow: "text-rbred-500",
    errorRow: "text-mist-400",
    retryBtn: "text-rbmist-600 hover:text-rborange-300 underline",
    missingRow: "text-rbred-300",
  },
};

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
    <div className="border-neutral-800 border-t pt-4">
      <div className="mb-2 flex items-center justify-between">
        <p
          className={`${colors.assets.label} text-xs uppercase tracking-wider`}
        >
          {label}
        </p>
        {assetsLoad === "error" && (
          <button
            type="button"
            onClick={onRetry}
            className={`text-xs ${colors.assets.retryBtn} transition-colors`}
          >
            Retry
          </button>
        )}
      </div>
      <div className="space-y-1.5">
        {links.map((link) => {
          if (assetsLoad === "loading") {
            return (
              <p
                key={link.linkId}
                className={`text-xs ${colors.assets.loadingRow}`}
              >
                loading…
              </p>
            );
          }
          if (assetsLoad === "error") {
            return (
              <p
                key={link.linkId}
                className={`text-xs ${colors.assets.errorRow}`}
              >
                load failed
              </p>
            );
          }
          const asset = assetsById.get(link.assetId);
          if (!asset) {
            return (
              <p
                key={link.linkId}
                className={`text-xs ${colors.assets.missingRow} font-mono`}
              >
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
                className={`shrink-0 rounded border px-1.5 py-0.5 text-xs uppercase tracking-wider ${assetClass(asset.subtype)}`}
              >
                {asset.subtype}
              </span>
              <span
                className={`text-sm ${colors.assets.linkText} flex-1 truncate transition-colors`}
              >
                {asset.title}
              </span>
              <span className={`text-xs ${colors.assets.kindBadge} shrink-0`}>
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
      <span className="text-neutral-600 text-xs">
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
              className="inline-block rounded border border-neutral-700 border-dashed px-1 py-0 text-neutral-500 text-xs"
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
        <button
          onClick={onPlayClick}
          className={`flex h-8 w-8 items-center justify-center rounded-full ${colors.trackPlayer.playButton} shrink-0 font-bold text-xs transition-colors`}
        >
          {playing ? "❚❚" : "▶"}
        </button>
        <div
          className="h-1.5 flex-1 cursor-pointer rounded-full bg-neutral-800"
          onClick={onSeek}
        >
          <div
            className={`h-full ${colors.trackPlayer.progressFill} rounded-full transition-all`}
            style={{
              width: duration ? `${(progress / duration) * 100}%` : "0%",
            }}
          />
        </div>
        <span
          className={`text-xs ${colors.trackPlayer.timestamp} shrink-0 tabular-nums`}
        >
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

  const submit = async (e: React.FormEvent) => {
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
          <span className={`${colors.noteThread.author} text-xs`}>
            {note.author.split("@")[0]}
          </span>
          <span className={`${colors.noteThread.timestamp} ml-2 text-xs`}>
            {new Date(note.createdAt).toLocaleString()}
          </span>
          <p className={`${colors.noteThread.body} mt-0.5 leading-relaxed`}>
            {note.text}
          </p>
        </div>
      ))}
      <form onSubmit={submit} className="flex gap-2 pt-1">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Add a note..."
          className={`flex-1 rounded border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-sm ${colors.noteThread.inputText} ${colors.noteThread.placeholder} focus:outline-none ${colors.noteThread.focusBorder}`}
        />
        <button
          type="submit"
          disabled={loading || !text.trim()}
          className={`bg-neutral-800 px-3 py-1.5 hover:bg-neutral-700 disabled:opacity-40 ${colors.noteThread.postBtn} rounded text-sm transition-colors`}
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
    return <p className={`${colors.page.description} text-sm`}>Loading...</p>;
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
    <div className="max-w-2xl">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className={`${colors.page.navLink} text-xs transition-colors`}
          >
            ← TrackGroups
          </Link>
          <Link
            href={`/admin/${trackGroupId}`}
            className={`${colors.page.navLink} text-xs transition-colors`}
          >
            Edit
          </Link>
        </div>
        <h1 className={`font-bold text-2xl ${colors.page.title} mt-2`}>
          {trackGroup.title}
        </h1>
        {trackGroup.description && (
          <p className={`${colors.page.description} mt-1 text-sm`}>
            {trackGroup.description}
          </p>
        )}
        <p className={`${colors.page.date} mt-2 text-xs`}>
          {new Date(trackGroup.createdAt).toLocaleDateString()}
        </p>
      </div>

      <div className="grid grid-cols-[280px_1fr] gap-6">
        {/* Tracklist */}
        <div className="space-y-1">
          <p
            className={`${colors.page.sectionLabel} mb-3 text-xs uppercase tracking-wider`}
          >
            Tracks
          </p>
          {validTracks.map((track, i) => (
            <button
              key={track.path}
              onClick={() => setActiveTrack(track.path)}
              className={`flex w-full items-start gap-3 rounded px-3 py-2.5 text-left transition-colors ${
                activeTrack === track.path
                  ? `bg-neutral-800 ${colors.tracklist.active}`
                  : `${colors.tracklist.idle} hover:bg-neutral-900`
              }`}
            >
              <span
                className={`${colors.tracklist.number} mt-0.5 w-4 shrink-0 text-xs tabular-nums`}
              >
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
            <div className="space-y-5 rounded-lg border border-neutral-800 p-5">
              <div>
                <h2 className={`font-semibold text-lg ${colors.page.title}`}>
                  {active.title}
                </h2>
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
              <div className="border-neutral-800 border-t pt-4">
                <p
                  className={`${colors.page.sectionLabel} mb-3 text-xs uppercase tracking-wider`}
                >
                  Notes
                </p>
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
