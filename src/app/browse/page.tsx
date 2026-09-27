"use client";

import { useEffect, useState } from "react";
import { SongPicker } from "@/components/SongPicker";
import { TagChips } from "@/components/TagChips";
import { stageBgClass, stageClass } from "@/lib/stage";
import type { CatalogEntry, Song, TrackGroup } from "@/types";
import tagsTaxonomy from "../../../tags.json";

const UNCLASSIFIED = "unclassified";

const TRACK_TAG_SUGGESTIONS = Object.keys(tagsTaxonomy.track?.tags ?? {});
const SONG_TAG_SUGGESTIONS = Object.keys(tagsTaxonomy.song?.tags ?? {});

const colors = {
  page: {
    title: "text-rbblue-600",
    subtitle: "text-rbred-400",
    loading: "text-neutral-600",
    empty: "text-neutral-600",
  },
  folder: {
    header: "hover:bg-neutral-900",
    name: "text-rbyellow-700 group-hover:text-cyan-400 font-large",
    count: "text-rbred-100",
    toggle: "text-rbpurple-400 hover:text-neutral-300",
  },
  trackRow: {
    name: "text-rbblue-300",
    size: "text-rbyellow-500",
    playLink: "text-green-500 hover:underline",
  },
};

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

export default function BrowsePage() {
  const [catalog, setCatalog] = useState<CatalogEntry[]>([]);
  const [songs, setSongs] = useState<Song[]>([]);
  const [trackGroups, setTrackGroups] = useState<TrackGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    Promise.all([
      fetch("/api/catalog").then((r) => r.json()) as Promise<CatalogEntry[]>,
      fetch("/api/songs").then((r) => r.json()) as Promise<Song[]>,
      fetch("/api/track-groups").then((r) => r.json()) as Promise<TrackGroup[]>,
    ]).then(([catalogData, songsData, trackGroupsData]) => {
      setCatalog(catalogData);
      setSongs(songsData);
      setTrackGroups(trackGroupsData);
      const songIds = new Set(catalogData.map((e) => e.songId ?? UNCLASSIFIED));
      setExpanded(songIds);
      setLoading(false);
    });
  }, []);

  const songsById = new Map(songs.map((s) => [s.id, s]));

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

  const handleSongCreated = (song: Song) => {
    setSongs((prev) => [...prev, song]);
  };

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

  return (
    <div className="max-w-xl">
      <div className="mb-8">
        <h1 className={`text-2xl font-bold ${colors.page.title}`}>Songs</h1>
        <p className={`${colors.page.subtitle} text-sm mt-1`}>
          Organized by folder
        </p>
      </div>

      {loading && (
        <p className={`${colors.page.loading} text-sm`}>Loading...</p>
      )}

      <div className="space-y-1">
        {groups.map((group) => {
          const isOpen = expanded.has(group.key);
          return (
            <div key={group.key}>
              <div
                className={`w-full flex items-center gap-2 px-3 py-2 rounded flex-wrap ${colors.folder.header}`}
              >
                <button
                  type="button"
                  onClick={() => toggle(group.key)}
                  className="flex items-center gap-2 min-w-0 flex-1 text-left"
                >
                  <span
                    className={`${colors.folder.toggle} text-xs w-3 shrink-0`}
                  >
                    {isOpen ? "▾" : "▸"}
                  </span>
                  <span
                    className={`text-left text-sm truncate ${colors.folder.name}`}
                  >
                    {group.name}
                  </span>
                </button>
                {group.key !== UNCLASSIFIED && group.songTags.length > 0 && (
                  <span className="text-xs text-neutral-600 shrink-0">
                    Tag Chips:
                  </span>
                )}
                {group.key !== UNCLASSIFIED && (
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
                )}
                {group.trackGroupCount > 0 && (
                  <span
                    className="text-xs text-neutral-600 shrink-0"
                    title={`Referenced in ${group.trackGroupCount} track group${group.trackGroupCount !== 1 ? "s" : ""}`}
                  >
                    in {group.trackGroupCount}
                  </span>
                )}
                <span className={`${colors.folder.count} text-xs tabular-nums`}>
                  {group.entries.length}
                </span>
              </div>

              {isOpen && (
                <div className="pl-7 space-y-1">
                  {group.entries.map((entry) => {
                    const memberOf = trackGroupsByPath.get(entry.path) ?? [];
                    const inherited = inheritedStages(entry.path, memberOf);
                    const entryTags = entry.tags ?? [];
                    return (
                      <div
                        key={entry.id}
                        className="flex items-center gap-3 px-3 py-1.5 rounded hover:bg-neutral-900 group flex-wrap sm:flex-nowrap"
                      >
                        <span
                          className={`w-full sm:w-auto sm:flex-1 text-sm ${colors.trackRow.name} truncate`}
                        >
                          {entry.title}
                        </span>
                        {inherited.length > 0 && (
                          <div className="flex items-center gap-1 shrink-0">
                            <span className="text-xs text-neutral-600">
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
                          <span className="text-xs text-neutral-600 shrink-0">
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
                              <span className="text-xs text-neutral-600 shrink-0">
                                Stage Chips:
                              </span>
                              <span
                                title="Legacy stage value from before tagging existed — not yet migrated to a tag."
                                className="text-xs border border-dashed border-neutral-600 text-neutral-500 px-1.5 py-0.5 rounded shrink-0"
                              >
                                {entry.stage}
                              </span>
                            </>
                          )}
                        {memberOf.length > 0 && (
                          <span
                            className="text-xs text-neutral-500 shrink-0"
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
