"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { AssetPicker, type AssetsLoadKind } from "@/components/AssetPicker";
import { SongPicker } from "@/components/SongPicker";
import { TagChips } from "@/components/TagChips";
import {
  assetLinkIds,
  effectiveAssets,
  reconcileAssetLinks,
} from "@/lib/asset";
import { stageBgClass, stageClass } from "@/lib/stage";
import type { Asset, CatalogEntry, Song, TrackGroup } from "@/types";
import tagsTaxonomy from "../../../tags.json";

const UNCLASSIFIED = "unclassified";

const TRACK_TAG_SUGGESTIONS = Object.keys(tagsTaxonomy.track?.tags ?? {});
const SONG_TAG_SUGGESTIONS = Object.keys(tagsTaxonomy.song?.tags ?? {});

/** element colors — bright cards (white + rbyellow frame) against the app's dark backdrop. */
const colors = {
  page: {
    title: "text-rbblue-500",
    subtitle: "text-rbred-400",
    loading: "text-neutral-400",
    empty: "text-neutral-400",
  },
  card: {
    container:
      "bg-white border-2 border-rbyellow-400 hover:border-rbyellow-500",
    name: "text-rbyellow-800",
    toggle: "text-neutral-400 hover:text-rbpurple-600",
    count: "text-rbred-600",
    label: "text-neutral-500",
    editBtn: "text-neutral-500 hover:text-green-600",
    saveBtn: "text-green-600 hover:text-green-500",
    cancelBtn: "text-neutral-500 hover:text-neutral-700",
    inputBorder: "border-rbyellow-300 focus:border-rbyellow-600",
  },
  trackRow: {
    hover: "hover:bg-rbyellow-100",
    name: "text-rbblue-700",
    size: "text-neutral-500",
    playLink: "text-green-600 hover:underline",
    label: "text-neutral-500",
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
  trackGroupCount: number;
  songTags: string[];
}

function AssetChip({
  asset,
  inherited,
}: {
  asset: Asset | undefined;
  assetId: string;
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
      className={`text-xs border rounded px-1.5 py-0.5 ${
        inherited
          ? "border-dashed border-neutral-400 text-neutral-500"
          : "border-violet-700 text-violet-700"
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

  const [assets, setAssets] = useState<Asset[]>([]);
  const [assetsLoad, setAssetsLoad] = useState<AssetsLoadKind>("loading");
  const [userEmail, setUserEmail] = useState("");

  const [editingSongId, setEditingSongId] = useState<string | null>(null);
  const [songDraft, setSongDraft] = useState<DraftSong>(emptySongDraft());
  const [editingTrackId, setEditingTrackId] = useState<string | null>(null);
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
    const groupIds = new Set<string>();
    for (const e of sortedEntries) {
      for (const tg of trackGroupsByPath.get(e.path) ?? []) groupIds.add(tg.id);
    }
    return {
      key,
      name:
        key === UNCLASSIFIED
          ? "Unclassified"
          : (songsById.get(key)?.name ?? key),
      entries: sortedEntries,
      trackGroupCount: groupIds.size,
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

  // Deep-link: ?editSong=<id> / ?editTrack=<id> expands + opens the editor for
  // a specific song or track and scrolls it into view. Runs once data is loaded.
  // biome-ignore lint/correctness/useExhaustiveDependencies: deliberately one-shot once loading flips to false; re-running on every songs/catalog update would re-force the editor open after the user closes it.
  useEffect(() => {
    if (loading) return;
    const editSongId = searchParams.get("editSong");
    const editTrackId = searchParams.get("editTrack");
    if (editSongId) {
      const song = songsById.get(editSongId);
      if (song) {
        setExpanded((prev) => new Set(prev).add(editSongId));
        setEditingSongId(song.id);
        setSongDraft({
          name: song.name,
          aliases: (song.aliases ?? []).join(", "),
          folderPrefix: song.folderPrefix ?? "",
          latestPath: song.latestPath ?? "",
        });
        document
          .getElementById(`song-${editSongId}`)
          ?.scrollIntoView({ block: "center" });
      }
    }
    if (editTrackId) {
      const entry = catalog.find((e) => e.id === editTrackId);
      if (entry) {
        setExpanded((prev) => new Set(prev).add(entry.songId ?? UNCLASSIFIED));
        setEditingTrackId(entry.id);
        setTrackDraft({ title: entry.title, mix: entry.mix });
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

  const startEditSong = (song: Song) => {
    setEditingSongId(song.id);
    setSongDraft({
      name: song.name,
      aliases: (song.aliases ?? []).join(", "),
      folderPrefix: song.folderPrefix ?? "",
      latestPath: song.latestPath ?? "",
    });
  };
  const cancelEditSong = () => {
    setEditingSongId(null);
    setSongDraft(emptySongDraft());
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
    cancelEditSong();
  };

  const startEditTrack = (entry: CatalogEntry) => {
    setEditingTrackId(entry.id);
    setTrackDraft({ title: entry.title, mix: entry.mix });
  };
  const cancelEditTrack = () => {
    setEditingTrackId(null);
    setTrackDraft(emptyEntryDraft());
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
    cancelEditTrack();
  };

  return (
    <div className="w-screen relative left-1/2 -translate-x-1/2 px-6 max-w-[1800px]">
      <div className="mb-8 px-1">
        <h1 className={`text-2xl font-bold ${colors.page.title}`}>Songs</h1>
        <p className={`${colors.page.subtitle} text-sm mt-1`}>
          Organized by folder
        </p>
      </div>

      {loading && (
        <p className={`${colors.page.loading} text-sm px-1`}>Loading...</p>
      )}

      <div className="catalog-grid">
        {groups.map((group) => {
          const isOpen = expanded.has(group.key);
          const song =
            group.key === UNCLASSIFIED ? undefined : songsById.get(group.key);
          return (
            <div
              key={group.key}
              id={`song-${group.key}`}
              className={`rounded-lg p-3 ${colors.card.container} transition-colors`}
            >
              <div className="flex items-start gap-2">
                <button
                  type="button"
                  onClick={() => toggle(group.key)}
                  className="flex items-center gap-2 min-w-0 flex-1 text-left"
                >
                  <span
                    className={`${colors.card.toggle} text-xs w-3 shrink-0`}
                  >
                    {isOpen ? "▾" : "▸"}
                  </span>
                  <span
                    className={`text-lg font-semibold truncate ${colors.card.name}`}
                  >
                    {group.name}
                  </span>
                </button>
                {group.trackGroupCount > 0 && (
                  <span
                    className={`text-xs shrink-0 ${colors.card.label}`}
                    title={`Referenced in ${group.trackGroupCount} track group${group.trackGroupCount !== 1 ? "s" : ""}`}
                  >
                    in {group.trackGroupCount}
                  </span>
                )}
                <span
                  className={`${colors.card.count} text-xs tabular-nums shrink-0`}
                >
                  {group.entries.length}
                </span>
              </div>

              {song && (
                <div className="flex items-center gap-2 flex-wrap mt-1.5">
                  {group.songTags.length > 0 && (
                    <span className={`text-xs ${colors.card.label}`}>
                      Tag Chips:
                    </span>
                  )}
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
                  <button
                    type="button"
                    onClick={() =>
                      editingSongId === song.id
                        ? cancelEditSong()
                        : startEditSong(song)
                    }
                    className={`text-xs ${colors.card.editBtn} transition-colors`}
                  >
                    {editingSongId === song.id ? "cancel" : "+ edit"}
                  </button>
                </div>
              )}

              {song && (
                <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                  {effectiveAssets(song.assets, undefined)
                    .filter((l) => l.inherited)
                    .map((l) => (
                      <AssetChip
                        key={l.linkId}
                        assetId={l.assetId}
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

              {song && editingSongId === song.id && (
                <div className="mt-2 pt-2 border-t border-rbyellow-200 space-y-1.5">
                  <input
                    value={songDraft.name}
                    onChange={(e) =>
                      setSongDraft((d) => ({ ...d, name: e.target.value }))
                    }
                    placeholder="Name"
                    className={`w-full bg-white border rounded px-2 py-1 text-sm text-neutral-800 focus:outline-none ${colors.card.inputBorder}`}
                  />
                  <input
                    value={songDraft.aliases}
                    onChange={(e) =>
                      setSongDraft((d) => ({ ...d, aliases: e.target.value }))
                    }
                    placeholder="Aliases (comma-separated)"
                    className={`w-full bg-white border rounded px-2 py-1 text-sm text-neutral-800 focus:outline-none ${colors.card.inputBorder}`}
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
                    className={`w-full bg-white border rounded px-2 py-1 text-sm font-mono text-neutral-800 focus:outline-none ${colors.card.inputBorder}`}
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
                    className={`w-full bg-white border rounded px-2 py-1 text-sm font-mono text-neutral-800 focus:outline-none ${colors.card.inputBorder}`}
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => saveEditSong(song.id)}
                      className={`text-xs px-2 ${colors.card.saveBtn} transition-colors`}
                    >
                      save
                    </button>
                    <button
                      type="button"
                      onClick={cancelEditSong}
                      className={`text-xs px-2 ${colors.card.cancelBtn} transition-colors`}
                    >
                      cancel
                    </button>
                  </div>
                </div>
              )}

              {isOpen && (
                <div className="mt-2 pt-2 border-t border-rbyellow-200 space-y-1">
                  {group.entries.map((entry) => {
                    const memberOf = trackGroupsByPath.get(entry.path) ?? [];
                    const inherited = inheritedStages(entry.path, memberOf);
                    const entryTags = entry.tags ?? [];
                    const isEditingTrack = editingTrackId === entry.id;
                    return (
                      <div
                        key={entry.id}
                        id={`track-${entry.id}`}
                        className={`rounded px-2 py-1.5 group ${colors.trackRow.hover}`}
                      >
                        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                          <span
                            className={`w-full sm:w-auto sm:flex-1 text-sm ${colors.trackRow.name} truncate`}
                          >
                            {entry.title}
                          </span>
                          {inherited.length > 0 && (
                            <div className="flex items-center gap-1 shrink-0">
                              <span
                                className={`text-xs ${colors.trackRow.label}`}
                              >
                                Stage Chips:
                              </span>
                              {inherited.map((stage) => (
                                <span
                                  key={stage}
                                  title="Track group stage — set within a track group this file belongs to, not editable here"
                                  className={`text-xs border px-1.5 py-0.5 rounded ${stageClass(stage)} ${stageBgClass(stage)}`}
                                >
                                  {stage}
                                </span>
                              ))}
                            </div>
                          )}
                          {entryTags.length > 0 && (
                            <span
                              className={`text-xs ${colors.trackRow.label} shrink-0`}
                            >
                              Tag Chips:
                            </span>
                          )}
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
                          {entryTags.length === 0 &&
                            entry.stage &&
                            entry.stage !== "unknown" && (
                              <>
                                <span
                                  className={`text-xs ${colors.trackRow.label} shrink-0`}
                                >
                                  Stage Chips:
                                </span>
                                <span
                                  title="Legacy stage value from before tagging existed — not yet migrated to a tag."
                                  className="text-xs border border-dashed border-neutral-400 text-neutral-500 px-1.5 py-0.5 rounded shrink-0"
                                >
                                  {entry.stage}
                                </span>
                              </>
                            )}
                          {memberOf.length > 0 && (
                            <span
                              className={`text-xs ${colors.trackRow.label} shrink-0`}
                              title={`In: ${memberOf.map((g) => g.title).join(", ")}`}
                            >
                              in {memberOf.length}
                            </span>
                          )}
                          <span
                            className={`${colors.trackRow.size} text-xs tabular-nums shrink-0`}
                          >
                            {sizeLabel(entry.size)}
                          </span>
                          <a
                            href={`/api/audio?path=${encodeURIComponent(entry.path)}`}
                            className={`text-xs ${colors.trackRow.playLink} opacity-0 group-hover:opacity-100 transition-opacity shrink-0`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            play
                          </a>
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                            <SongPicker
                              songs={songs}
                              loadState={loading ? "loading" : "loaded"}
                              value={entry.songId}
                              onAssign={(song) => handleAssign(entry, song)}
                              onSongCreated={handleSongCreated}
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              isEditingTrack
                                ? cancelEditTrack()
                                : startEditTrack(entry)
                            }
                            className={`text-xs shrink-0 ${colors.card.editBtn} transition-colors`}
                          >
                            {isEditingTrack ? "cancel" : "+ edit"}
                          </button>
                        </div>

                        <div className="flex items-center gap-1.5 flex-wrap mt-1">
                          {effectiveAssets(entry.assets, song?.assets)
                            .filter((l) => l.inherited)
                            .map((l) => (
                              <AssetChip
                                key={l.linkId}
                                assetId={l.assetId}
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

                        {isEditingTrack && (
                          <div className="mt-1.5 space-y-1.5">
                            <input
                              value={trackDraft.title}
                              onChange={(e) =>
                                setTrackDraft((d) => ({
                                  ...d,
                                  title: e.target.value,
                                }))
                              }
                              placeholder="Title"
                              className={`w-full bg-white border rounded px-2 py-1 text-sm text-neutral-800 focus:outline-none ${colors.card.inputBorder}`}
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
                              className={`w-full bg-white border rounded px-2 py-1 text-sm font-mono text-neutral-800 focus:outline-none ${colors.card.inputBorder}`}
                            />
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => saveEditTrack(entry.id)}
                                className={`text-xs px-2 ${colors.card.saveBtn} transition-colors`}
                              >
                                save
                              </button>
                              <button
                                type="button"
                                onClick={cancelEditTrack}
                                className={`text-xs px-2 ${colors.card.cancelBtn} transition-colors`}
                              >
                                cancel
                              </button>
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
        <p className={`${colors.page.empty} text-sm px-1`}>
          No tracks in the catalog yet.
        </p>
      )}
    </div>
  );
}

export default function BrowsePage() {
  return (
    <Suspense
      fallback={<div className="px-1 text-sm text-neutral-400">Loading...</div>}
    >
      <BrowsePageInner />
    </Suspense>
  );
}
