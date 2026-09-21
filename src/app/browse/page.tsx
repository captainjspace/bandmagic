"use client";

import { useEffect, useState } from "react";
import { SongPicker } from "@/components/SongPicker";
import { stageBgClass, stageClass } from "@/lib/stage";
import type { CatalogEntry, Song } from "@/types";

const UNCLASSIFIED = "unclassified";

/** element colors */
const colors = {
  page: {
    title: "text-neutral-100",
    subtitle: "text-neutral-500",
    loading: "text-neutral-600",
    empty: "text-neutral-600",
  },
  folder: {
    header: "hover:bg-neutral-900",
    name: "text-neutral-200 font-medium",
    count: "text-neutral-600",
    toggle: "text-neutral-600",
  },
  trackRow: {
    name: "text-neutral-300",
    size: "text-neutral-600",
    playLink: "text-green-500 hover:underline",
  },
};

function sizeLabel(bytes?: number) {
  const n = bytes ?? 0;
  if (n > 1_000_000) return `${(n / 1_000_000).toFixed(1)} MB`;
  if (n > 1_000) return `${(n / 1_000).toFixed(0)} KB`;
  return `${n} B`;
}

interface Group {
  key: string;
  name: string;
  entries: CatalogEntry[];
}

export default function BrowsePage() {
  const [catalog, setCatalog] = useState<CatalogEntry[]>([]);
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    Promise.all([
      fetch("/api/catalog").then((r) => r.json()) as Promise<CatalogEntry[]>,
      fetch("/api/songs").then((r) => r.json()) as Promise<Song[]>,
    ]).then(([catalogData, songsData]) => {
      setCatalog(catalogData);
      setSongs(songsData);
      const songIds = new Set(catalogData.map((e) => e.songId ?? UNCLASSIFIED));
      setExpanded(songIds);
      setLoading(false);
    });
  }, []);

  const songNames = new Map(songs.map((s) => [s.id, s.name]));
  const byGroup = new Map<string, CatalogEntry[]>();
  for (const entry of catalog) {
    const key = entry.songId ?? UNCLASSIFIED;
    if (!byGroup.has(key)) byGroup.set(key, []);
    byGroup.get(key)?.push(entry);
  }

  const groups: Group[] = Array.from(byGroup, ([key, entries]) => ({
    key,
    name: key === UNCLASSIFIED ? "Unclassified" : (songNames.get(key) ?? key),
    entries: [...entries].sort((a, b) => a.title.localeCompare(b.title)),
  })).sort((a, b) => {
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

  return (
    <div className="max-w-xl">
      <div className="mb-8">
        <h1 className={`text-2xl font-bold ${colors.page.title}`}>Browse</h1>
        <p className={`${colors.page.subtitle} text-sm mt-1`}>
          Songs, by folder
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
              <button
                onClick={() => toggle(group.key)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded ${colors.folder.header}`}
              >
                <span
                  className={`${colors.folder.toggle} text-xs w-3 shrink-0`}
                >
                  {isOpen ? "▾" : "▸"}
                </span>
                <span
                  className={`flex-1 text-left text-sm ${colors.folder.name}`}
                >
                  {group.name}
                </span>
                <span className={`${colors.folder.count} text-xs tabular-nums`}>
                  {group.entries.length}
                </span>
              </button>

              {isOpen && (
                <div className="pl-7 space-y-1">
                  {group.entries.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center gap-3 px-3 py-1.5 rounded hover:bg-neutral-900 group"
                    >
                      <span
                        className={`flex-1 text-sm ${colors.trackRow.name} truncate`}
                      >
                        {entry.title}
                      </span>
                      <span
                        className={`text-xs border px-1.5 py-0.5 rounded shrink-0 ${stageClass(entry.stage)} ${stageBgClass(entry.stage)}`}
                      >
                        {entry.stage}
                      </span>
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
                  ))}
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
