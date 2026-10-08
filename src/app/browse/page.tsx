"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { AssetPicker, type AssetsLoadKind } from "@/components/AssetPicker";
import { SongChip } from "@/components/SongChip";
import { SongPicker } from "@/components/SongPicker";
import { TagChips } from "@/components/TagChips";
import { TrackChip } from "@/components/TrackChip";
import {
  assetLinkIds,
  effectiveAssets,
  reconcileAssetLinks,
} from "@/lib/asset";
import { stageBgClass, stageClass } from "@/lib/stage";
import type { Asset, CatalogEntry, Song, TrackGroup } from "@/types";
import tagsTaxonomy from "../../../tags.json" with { type: "json" };

const UNCLASSIFIED = "unclassified";

const TRACK_TAG_SUGGESTIONS = Object.keys(tagsTaxonomy.track?.tags ?? {});
const SONG_TAG_SUGGESTIONS = Object.keys(tagsTaxonomy.song?.tags ?? {});

const colors = {
  page: {
    title: "text-rbblue-500",
    subtitle: "text-rbblue-700",
    loading: "text-neutral-500",
    empty: "text-neutral-500",
  },
  song: {
    box: "border border-rbyellow-800 rounded-lg hover:border-rbyellow-600 transition-colors",
    toggle: "text-rbyellow-700 hover:text-rbyellow-500",
    count: "text-rbyellow-600",
    label: "text-neutral-600",
  },
  track: {
    box: "border border-cyan-800 rounded hover:border-cyan-600 transition-colors",
    hover: "hover:bg-neutral-900",
    name: "text-cyan-400",
    size: "text-rbyellow-500",
    playLink: "text-green-500 hover:underline",
    label: "text-neutral-600",
  },
  panel: {
    border: "border-neutral-800",
    saveBtn: "text-green-500 hover:text-green-400",
    cancelBtn: "text-neutral-600 hover:text-neutral-400",
    inputBg:
      "bg-neutral-950 border-neutral-700 text-neutral-100 focus:border-green-600",
  },
};

type DraftSong = {
  name: string;
  aliases: string;
  folderPrefix: string;
  latestPath: string;
};
const emptySongDraft = (): DraftSong => ({
  name: "",
  aliases: "",
  folderPrefix: "",
  latestPath: "",
});

type DraftEntry = { title: string; mix: string };
const emptyEntryDraft = (): DraftEntry => ({ title: "", mix: "" });

function sizeLabel(bytes?: number) {
  const n = bytes ?? 0;
  if (n > 1_000_000) return `${(n / 1_000_000).toFixed(1)} MB`;
  if (n > 1_000) return `${(n / 1_000).toFixed(0)} KB`;
  return `${n} B`;
}

/** Distinct non-"unknown" stage values a path already carries on any curated track group. */
function inheritedStages(path: string, memberOf: TrackGroup[]): string[] {
  const stages = new Set<string>();
  for (const tg of memberOf) {
    for (const t of tg.tracks) {
      if (t.path === path && t.stage && t.stage !== "unknown") {
        stages.add(t.stage);
      }
    }
  }
  return [...stages];
}

interface Group {
  key: string;
  name: string;
  entries: CatalogEntry[];
  trackGroups: TrackGroup[];
  songTags: string[];
}

function AssetChip({
  asset,
  inherited,
}: {
  asset: Asset | undefined;
  inherited: boolean;
}) {
  if (!asset) return null;
  return (
    <span
      title={
        inherited
          ? "Inherited from this track's song — remove it on the song, not here."
          : undefined
      }
      className={`shrink-0 rounded border px-1.5 py-0.5 text-xs ${
        inherited
          ? "border-neutral-700 border-dashed text-neutral-500"
          : "border-violet-800 text-violet-400"
      }`}
    >
      {asset.title}
    </span>
  );
}

function BrowsePageInner() {
  const searchParams = useSearchParams();

  const [catalog, setCatalog] = useState<CatalogEntry[]>([]);
  const [songs, setSongs] = useState<Song[]>([]);
  const [trackGroups, setTrackGroups] = useState<TrackGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [openTrackGroupsFor, setOpenTrackGroupsFor] = useState<Set<string>>(
    new Set(),
  );

  const [assets, setAssets] = useState<Asset[]>([]);
  const [assetsLoad, setAssetsLoad] = useState<AssetsLoadKind>("loading");
  const [userEmail, setUserEmail] = useState("");

  // "Actions" panel open state doubles as edit-mode state — opening it seeds the
  // draft and shows the asset picker + field editor together; there's nothing
  // else behind it, so one flag covers both.
  const [openSongId, setOpenSongId] = useState<string | null>(null);
  const [songDraft, setSongDraft] = useState<DraftSong>(emptySongDraft());
  const [openTrackId, setOpenTrackId] = useState<string | null>(null);
  const [trackDraft, setTrackDraft] = useState<DraftEntry>(emptyEntryDraft());

  useEffect(() => {
    Promise.all([
      fetch("/api/catalog").then((r) => r.json()) as Promise<CatalogEntry[]>,
      fetch("/api/songs").then((r) => r.json()) as Promise<Song[]>,
      fetch("/api/track-groups").then((r) => r.json()) as Promise<TrackGroup[]>,
      fetch("/api/assets")
        .then((r) => r.json() as Promise<Asset[]>)
        .then((a) => {
          setAssetsLoad("loaded");
          return a;
        })
        .catch(() => {
          setAssetsLoad("error");
          return [] as Asset[];
        }),
    ]).then(([catalogData, songsData, trackGroupsData, assetsData]) => {
      setCatalog(catalogData);
      setSongs(songsData);
      setTrackGroups(trackGroupsData);
      setAssets(assetsData);
      const songIds = new Set(catalogData.map((e) => e.songId ?? UNCLASSIFIED));
      setExpanded(songIds);
      setLoading(false);
    });
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setUserEmail(d.email ?? ""))
      .catch(() => {});
  }, []);

  const songsById = new Map(songs.map((s) => [s.id, s]));
  const assetsById = new Map(assets.map((a) => [a.id, a]));

  // Cross-reference: which track groups reference each catalog path, and what
  // stage those groups already assigned it — derived entirely from data
  // already fetched above, no new field or endpoint.
  const trackGroupsByPath = new Map<string, TrackGroup[]>();
  for (const tg of trackGroups) {
    for (const t of tg.tracks) {
      if (!trackGroupsByPath.has(t.path)) trackGroupsByPath.set(t.path, []);
      trackGroupsByPath.get(t.path)?.push(tg);
    }
  }

  const byGroup = new Map<string, CatalogEntry[]>();
  for (const entry of catalog) {
    const key = entry.songId ?? UNCLASSIFIED;
    if (!byGroup.has(key)) byGroup.set(key, []);
    byGroup.get(key)?.push(entry);
  }

  const groups: Group[] = Array.from(byGroup, ([key, entries]) => {
    const sortedEntries = [...entries].sort((a, b) =>
      a.title.localeCompare(b.title),
    );
    const trackGroupsById = new Map<string, TrackGroup>();
    for (const e of sortedEntries) {
      for (const tg of trackGroupsByPath.get(e.path) ?? [])
        trackGroupsById.set(tg.id, tg);
    }
    return {
      key,
      name:
        key === UNCLASSIFIED
          ? "Unclassified"
          : (songsById.get(key)?.name ?? key),
      entries: sortedEntries,
      trackGroups: Array.from(trackGroupsById.values()),
      songTags: key === UNCLASSIFIED ? [] : (songsById.get(key)?.tags ?? []),
    };
  }).sort((a, b) => {
    if (a.key === UNCLASSIFIED) return 1;
    if (b.key === UNCLASSIFIED) return -1;
    return a.name.localeCompare(b.name);
  });

  const toggle = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleTrackGroups = (key: string) => {
    setOpenTrackGroupsFor((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const startEditSong = (song: Song) => {
    setOpenSongId(song.id);
    setSongDraft({
      name: song.name,
      aliases: (song.aliases ?? []).join(", "),
      folderPrefix: song.folderPrefix ?? "",
      latestPath: song.latestPath ?? "",
    });
  };
  const closeSongActions = () => {
    setOpenSongId(null);
    setSongDraft(emptySongDraft());
  };

  const startEditTrack = (entry: CatalogEntry) => {
    setOpenTrackId(entry.id);
    setTrackDraft({ title: entry.title, mix: entry.mix });
  };
  const closeTrackActions = () => {
    setOpenTrackId(null);
    setTrackDraft(emptyEntryDraft());
  };

  // Deep-link: ?editSong=<id> / ?editTrack=<id> expands + opens the actions
  // panel for a specific song or track and scrolls it into view.
  // biome-ignore lint/correctness/useExhaustiveDependencies: deliberately one-shot once loading flips to false; re-running on every songs/catalog update would re-force the panel open after the user closes it.
  useEffect(() => {
    if (loading) return;
    const editSongId = searchParams.get("editSong");
    const editTrackId = searchParams.get("editTrack");
    if (editSongId) {
      const song = songsById.get(editSongId);
      if (song) {
        setExpanded((prev) => new Set(prev).add(editSongId));
        startEditSong(song);
        document
          .getElementById(`song-${editSongId}`)
          ?.scrollIntoView({ block: "center" });
      }
    }
    if (editTrackId) {
      const entry = catalog.find((e) => e.id === editTrackId);
      if (entry) {
        setExpanded((prev) => new Set(prev).add(entry.songId ?? UNCLASSIFIED));
        startEditTrack(entry);
        document
          .getElementById(`track-${editTrackId}`)
          ?.scrollIntoView({ block: "center" });
      }
    }
  }, [loading]);

  const handleSongCreated = (song: Song) => {
    setSongs((prev) => [...prev, song]);
  };

  const handleAssetCreated = useCallback((asset: Asset) => {
    setAssets((prev) => [asset, ...prev]);
  }, []);

  const handleAssign = async (entry: CatalogEntry, song: Song) => {
    setExpanded((prev) => new Set(prev).add(song.id));
    setCatalog((prev) =>
      prev.map((e) => (e.id === entry.id ? { ...e, songId: song.id } : e)),
    );
    await fetch(`/api/catalog/${encodeURIComponent(entry.id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ songId: song.id }),
    });
  };

  const patchTrackTags = async (entry: CatalogEntry, nextTags: string[]) => {
    setCatalog((prev) =>
      prev.map((e) => (e.id === entry.id ? { ...e, tags: nextTags } : e)),
    );
    await fetch(`/api/catalog/${encodeURIComponent(entry.id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tags: nextTags }),
    });
  };

  const patchSongTags = async (songId: string, nextTags: string[]) => {
    setSongs((prev) =>
      prev.map((s) => (s.id === songId ? { ...s, tags: nextTags } : s)),
    );
    await fetch(`/api/songs/${encodeURIComponent(songId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tags: nextTags }),
    });
  };

  const patchSongAssets = async (song: Song, ids: string[]) => {
    const nextLinks = reconcileAssetLinks(song.assets, ids, userEmail);
    setSongs((prev) =>
      prev.map((s) => (s.id === song.id ? { ...s, assets: nextLinks } : s)),
    );
    await fetch(`/api/songs/${encodeURIComponent(song.id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assets: nextLinks }),
    });
  };

  const patchTrackAssets = async (entry: CatalogEntry, ids: string[]) => {
    const nextLinks = reconcileAssetLinks(entry.assets, ids, userEmail);
    setCatalog((prev) =>
      prev.map((e) => (e.id === entry.id ? { ...e, assets: nextLinks } : e)),
    );
    await fetch(`/api/catalog/${encodeURIComponent(entry.id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assets: nextLinks }),
    });
  };

  const saveEditSong = async (id: string) => {
    const res = await fetch(`/api/songs/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: songDraft.name.trim(),
        aliases: songDraft.aliases
          .split(",")
          .map((a) => a.trim())
          .filter(Boolean),
        folderPrefix: songDraft.folderPrefix.trim(),
        latestPath: songDraft.latestPath.trim(),
      }),
    });
    if (res.ok) {
      const updated: Song = await res.json();
      setSongs((prev) => prev.map((s) => (s.id === id ? updated : s)));
    }
    closeSongActions();
  };

  const saveEditTrack = async (id: string) => {
    const res = await fetch(`/api/catalog/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: trackDraft.title.trim(),
        mix: trackDraft.mix.trim(),
      }),
    });
    if (res.ok) {
      const updated: CatalogEntry = await res.json();
      setCatalog((prev) => prev.map((e) => (e.id === id ? updated : e)));
    }
    closeTrackActions();
  };

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-8">
        <h1 className={`font-bold text-2xl ${colors.page.title}`}>Songs</h1>
        <p className={`${colors.page.subtitle} mt-1 text-sm`}>
          Organized by folder
        </p>
      </div>

      {loading && (
        <p className={`${colors.page.loading} text-sm`}>Loading...</p>
      )}

      <div className="space-y-3">
        {groups.map((group) => {
          const isOpen = expanded.has(group.key);
          const song =
            group.key === UNCLASSIFIED ? undefined : songsById.get(group.key);
          const actionsOpen = !!song && openSongId === song.id;
          return (
            <div
              key={group.key}
              id={`song-${group.key}`}
              className={`p-3 ${colors.song.box}`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => toggle(group.key)}
                  title={isOpen ? "Collapse" : "Expand"}
                  className={`${colors.song.toggle} -m-1 w-3 shrink-0 p-1 text-xs`}
                >
                  {isOpen ? "▾" : "▸"}
                </button>
                {song ? (
                  <button
                    type="button"
                    onClick={() =>
                      actionsOpen ? closeSongActions() : startEditSong(song)
                    }
                    title={actionsOpen ? "Close editor" : "Edit song"}
                    className={`min-w-0 transition-transform hover:scale-105 ${actionsOpen ? "rounded ring-2 ring-rbyellow-500" : ""}`}
                  >
                    <SongChip name={group.name} size="xl" />
                  </button>
                ) : (
                  <div className="min-w-0">
                    <SongChip name={group.name} size="xl" />
                  </div>
                )}
                {song && (
                  <div className="flex items-center gap-1.5">
                    <span className={`text-xs ${colors.song.label}`}>
                      Tags:
                    </span>
                    <TagChips
                      tags={group.songTags}
                      entityType="song"
                      suggestions={SONG_TAG_SUGGESTIONS}
                      listId={`song-tags-${group.key}`}
                      onAdd={(tag) =>
                        patchSongTags(
                          group.key,
                          Array.from(new Set([...group.songTags, tag])),
                        )
                      }
                      onRemove={(tag) =>
                        patchSongTags(
                          group.key,
                          group.songTags.filter((t) => t !== tag),
                        )
                      }
                    />
                  </div>
                )}
                <div className="ml-auto flex shrink-0 items-center gap-3">
                  {group.trackGroups.length > 0 && (
                    <button
                      type="button"
                      onClick={() => toggleTrackGroups(`song-${group.key}`)}
                      className={`text-xs ${colors.song.label} hover:underline`}
                    >
                      In {group.trackGroups.length} track group
                      {group.trackGroups.length !== 1 ? "s" : ""}
                    </button>
                  )}
                  <span
                    className={`${colors.song.count} font-semibold text-sm tabular-nums`}
                  >
                    {group.entries.length}
                  </span>
                </div>
              </div>

              {openTrackGroupsFor.has(`song-${group.key}`) &&
                group.trackGroups.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    {group.trackGroups.map((tg) => (
                      <Link
                        key={tg.id}
                        href={`/track-group/${tg.id}`}
                        className={`text-xs underline ${colors.song.toggle}`}
                      >
                        {tg.title}
                      </Link>
                    ))}
                  </div>
                )}

              {song && (
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {effectiveAssets(song.assets, undefined)
                    .filter((l) => l.inherited)
                    .map((l) => (
                      <AssetChip
                        key={l.linkId}
                        asset={assetsById.get(l.assetId)}
                        inherited
                      />
                    ))}
                  <AssetPicker
                    value={assetLinkIds(song.assets)}
                    onChange={(ids) => patchSongAssets(song, ids)}
                    assets={assets}
                    loadState={assetsLoad}
                    onAssetCreated={handleAssetCreated}
                  />
                </div>
              )}

              {song && actionsOpen && (
                <div
                  className={`mt-3 border-t pt-3 ${colors.panel.border} space-y-3`}
                >
                  <div className="space-y-1.5">
                    <p className="text-neutral-600 text-xs">Fields</p>
                    <input
                      value={songDraft.name}
                      onChange={(e) =>
                        setSongDraft((d) => ({ ...d, name: e.target.value }))
                      }
                      placeholder="Name"
                      className={`w-full rounded border px-2 py-1 text-sm focus:outline-none ${colors.panel.inputBg}`}
                    />
                    <input
                      value={songDraft.aliases}
                      onChange={(e) =>
                        setSongDraft((d) => ({
                          ...d,
                          aliases: e.target.value,
                        }))
                      }
                      placeholder="Aliases (comma-separated)"
                      className={`w-full rounded border px-2 py-1 text-sm focus:outline-none ${colors.panel.inputBg}`}
                    />
                    <input
                      value={songDraft.folderPrefix}
                      onChange={(e) =>
                        setSongDraft((d) => ({
                          ...d,
                          folderPrefix: e.target.value,
                        }))
                      }
                      placeholder="Folder Prefix"
                      className={`w-full rounded border px-2 py-1 font-mono text-sm focus:outline-none ${colors.panel.inputBg}`}
                    />
                    <input
                      value={songDraft.latestPath}
                      onChange={(e) =>
                        setSongDraft((d) => ({
                          ...d,
                          latestPath: e.target.value,
                        }))
                      }
                      placeholder="Latest Path"
                      className={`w-full rounded border px-2 py-1 font-mono text-sm focus:outline-none ${colors.panel.inputBg}`}
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => saveEditSong(song.id)}
                        className={`px-2 text-xs ${colors.panel.saveBtn} transition-colors`}
                      >
                        save
                      </button>
                      <button
                        type="button"
                        onClick={closeSongActions}
                        className={`px-2 text-xs ${colors.panel.cancelBtn} transition-colors`}
                      >
                        cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {isOpen && (
                <div className="mt-3 space-y-2">
                  {group.entries.map((entry) => {
                    const memberOf = trackGroupsByPath.get(entry.path) ?? [];
                    const inherited = inheritedStages(entry.path, memberOf);
                    const entryTags = entry.tags ?? [];
                    const trackActionsOpen = openTrackId === entry.id;
                    const effectiveTrackAssets = effectiveAssets(
                      entry.assets,
                      song?.assets,
                    );
                    const filename = entry.path.split("/").pop() ?? entry.path;
                    return (
                      <div
                        key={entry.id}
                        id={`track-${entry.id}`}
                        className={`group px-3 py-2 ${colors.track.box} ${colors.track.hover}`}
                      >
                        <div className="flex flex-wrap items-center gap-3">
                          <button
                            type="button"
                            onClick={() =>
                              trackActionsOpen
                                ? closeTrackActions()
                                : startEditTrack(entry)
                            }
                            title={
                              trackActionsOpen ? "Close editor" : "Edit track"
                            }
                            className={`min-w-0 transition-transform hover:scale-105 ${trackActionsOpen ? "rounded ring-2 ring-cyan-500" : ""}`}
                          >
                            <TrackChip name={filename} size="lg" />
                          </button>
                          <span
                            title={
                              inherited.length > 0
                                ? `Track group stage: ${inherited.join(", ")}`
                                : undefined
                            }
                            className={`shrink-0 rounded border px-1.5 py-0.5 text-xs ${stageClass(inherited[0] ?? entry.stage)} ${stageBgClass(inherited[0] ?? entry.stage)}`}
                          >
                            {inherited[0] ?? entry.stage ?? "unknown"}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span className={`text-xs ${colors.track.label}`}>
                              Tags:
                            </span>
                            <TagChips
                              tags={entryTags}
                              entityType="track"
                              suggestions={TRACK_TAG_SUGGESTIONS}
                              listId={`track-tags-${entry.id}`}
                              onAdd={(tag) =>
                                patchTrackTags(
                                  entry,
                                  Array.from(new Set([...entryTags, tag])),
                                )
                              }
                              onRemove={(tag) =>
                                patchTrackTags(
                                  entry,
                                  entryTags.filter((t) => t !== tag),
                                )
                              }
                            />
                          </div>
                          {memberOf.length > 0 && (
                            <button
                              type="button"
                              onClick={() =>
                                toggleTrackGroups(`track-${entry.id}`)
                              }
                              className={`text-xs ${colors.track.label} shrink-0 hover:underline`}
                            >
                              In {memberOf.length} track group
                              {memberOf.length !== 1 ? "s" : ""}
                            </button>
                          )}
                          <div className="ml-auto flex shrink-0 items-center gap-3">
                            <a
                              href={`/api/audio?path=${encodeURIComponent(entry.path)}`}
                              className={`text-xs ${colors.track.playLink} opacity-0 transition-opacity group-hover:opacity-100`}
                              target="_blank"
                              rel="noreferrer"
                            >
                              play
                            </a>
                            <div className="opacity-0 transition-opacity group-hover:opacity-100">
                              <SongPicker
                                songs={songs}
                                loadState={loading ? "loading" : "loaded"}
                                value={entry.songId}
                                onAssign={(song) => handleAssign(entry, song)}
                                onSongCreated={handleSongCreated}
                              />
                            </div>
                            <span
                              className={`${colors.track.size} text-xs tabular-nums`}
                            >
                              {sizeLabel(entry.size)}
                            </span>
                          </div>
                        </div>

                        {openTrackGroupsFor.has(`track-${entry.id}`) &&
                          memberOf.length > 0 && (
                            <div className="mt-1.5 flex flex-wrap items-center gap-2">
                              {memberOf.map((tg) => (
                                <Link
                                  key={tg.id}
                                  href={`/track-group/${tg.id}`}
                                  className={`text-xs underline ${colors.track.name}`}
                                >
                                  {tg.title}
                                </Link>
                              ))}
                            </div>
                          )}

                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          {effectiveTrackAssets
                            .filter((l) => l.inherited)
                            .map((l) => (
                              <AssetChip
                                key={l.linkId}
                                asset={assetsById.get(l.assetId)}
                                inherited
                              />
                            ))}
                          <AssetPicker
                            value={assetLinkIds(entry.assets)}
                            onChange={(ids) => patchTrackAssets(entry, ids)}
                            assets={assets}
                            loadState={assetsLoad}
                            onAssetCreated={handleAssetCreated}
                          />
                        </div>

                        {trackActionsOpen && (
                          <div
                            className={`mt-2 border-t pt-2 ${colors.panel.border} space-y-3`}
                          >
                            <div className="space-y-1.5">
                              <p className="text-neutral-600 text-xs">Fields</p>
                              <input
                                value={trackDraft.title}
                                onChange={(e) =>
                                  setTrackDraft((d) => ({
                                    ...d,
                                    title: e.target.value,
                                  }))
                                }
                                placeholder="Title"
                                className={`w-full rounded border px-2 py-1 text-sm focus:outline-none ${colors.panel.inputBg}`}
                              />
                              <input
                                value={trackDraft.mix}
                                onChange={(e) =>
                                  setTrackDraft((d) => ({
                                    ...d,
                                    mix: e.target.value,
                                  }))
                                }
                                placeholder="Mix"
                                className={`w-full rounded border px-2 py-1 font-mono text-sm focus:outline-none ${colors.panel.inputBg}`}
                              />
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => saveEditTrack(entry.id)}
                                  className={`px-2 text-xs ${colors.panel.saveBtn} transition-colors`}
                                >
                                  save
                                </button>
                                <button
                                  type="button"
                                  onClick={closeTrackActions}
                                  className={`px-2 text-xs ${colors.panel.cancelBtn} transition-colors`}
                                >
                                  cancel
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {!loading && groups.length === 0 && (
        <p className={`${colors.page.empty} text-sm`}>
          No tracks in the catalog yet.
        </p>
      )}
    </div>
  );
}

export default function BrowsePage() {
  return (
    <Suspense
      fallback={<div className="text-rbpurple-500 text-sm">Loading...</div>}
    >
      <BrowsePageInner />
    </Suspense>
  );
}
