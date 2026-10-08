"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SongPicker, type SongsLoadKind } from "@/components/SongPicker";
import { TagChips } from "@/components/TagChips";
import type { CatalogEntry, Song } from "@/types";
import tagsTaxonomy from "../../../../tags.json";

const TRACK_TAG_SUGGESTIONS = Object.keys(tagsTaxonomy.track?.tags ?? {});

/** element colors */
const colors = {
  page: {
    title: "test-rbblue-300",
    subtitle: "test-gradient-mist",
    navLink: "test-rbviolet-500 hover:test-rbviolet-300",
    count: "test-rbviolet-600",
  },
  status: {
    error: "text-red-400",
  },
  row: {
    label: "test-rbviolet-500",
    value: "test-rbviolet-100",
    mono: "test-rbviolet-300 font-mono",
    id: "test-rbviolet-700 font-mono",
    editBtn: "test-rbblue-700 hover:text-green-400",
    saveBtn: "text-green-500 hover:text-green-400",
    cancelBtn: "test-rbviolet-500 hover:test-rbviolet-300",
  },
};

function sizeLabel(bytes?: number) {
  const n = bytes ?? 0;
  if (n > 1_000_000) return `${(n / 1_000_000).toFixed(1)} MB`;
  if (n > 1_000) return `${(n / 1_000).toFixed(0)} KB`;
  return `${n} B`;
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className={`text-xs ${colors.row.label} uppercase tracking-wider`}>
        {label}
      </p>
      <div className="mt-0.5 text-sm">{children}</div>
    </div>
  );
}

type DraftEntry = { title: string; mix: string };
const emptyDraft = (): DraftEntry => ({ title: "", mix: "" });

export default function AdminCatalogPage() {
  const [catalog, setCatalog] = useState<CatalogEntry[]>([]);
  const [songs, setSongs] = useState<Song[]>([]);
  const [songsLoad, setSongsLoad] = useState<SongsLoadKind>("loading");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<DraftEntry>(emptyDraft());

  // biome-ignore lint/correctness/useExhaustiveDependencies: run once on mount; reload isn't memoized so listing it would re-fire every render.
  useEffect(() => {
    reload();
  }, []);

  async function reload() {
    setLoading(true);
    setError("");
    try {
      const [catalogRes, songsRes] = await Promise.all([
        fetch("/api/catalog"),
        fetch("/api/songs"),
      ]);
      if (!catalogRes.ok)
        throw new Error(`Failed to load: ${catalogRes.status}`);
      setCatalog(await catalogRes.json());
      if (songsRes.ok) {
        setSongs(await songsRes.json());
        setSongsLoad("loaded");
      } else {
        setSongsLoad("error");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load catalog");
    } finally {
      setLoading(false);
    }
  }

  const filtered = query.trim()
    ? catalog.filter(
        (e) =>
          e.title.toLowerCase().includes(query.toLowerCase()) ||
          e.path.toLowerCase().includes(query.toLowerCase()) ||
          e.song.toLowerCase().includes(query.toLowerCase()),
      )
    : catalog;

  const startEdit = (e: CatalogEntry) => {
    setEditingId(e.id);
    setEditDraft({ title: e.title, mix: e.mix });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDraft(emptyDraft());
  };

  const saveEdit = async (id: string) => {
    setError("");
    try {
      const res = await fetch(`/api/catalog/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editDraft.title.trim(),
          mix: editDraft.mix.trim(),
        }),
      });
      if (!res.ok) throw new Error((await res.text()) || "Save failed");
      cancelEdit();
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    }
  };

  const patchTags = async (entry: CatalogEntry, nextTags: string[]) => {
    setCatalog((prev) =>
      prev.map((e) => (e.id === entry.id ? { ...e, tags: nextTags } : e)),
    );
    await fetch(`/api/catalog/${encodeURIComponent(entry.id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tags: nextTags }),
    });
  };

  const assignSong = async (entry: CatalogEntry, song: Song) => {
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
    <div className="max-w-3xl">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className={`font-bold text-2xl ${colors.page.title}`}>Catalog</h1>
          <p className={`${colors.page.subtitle} mt-1 text-sm`}>
            Edit the CatalogEntry (track) Firestore documents directly.
          </p>
        </div>
        <Link
          href="/admin"
          className={`${colors.page.navLink} mt-1 text-xs transition-colors`}
        >
          ← Admin
        </Link>
      </div>

      {error && (
        <div className="mb-6 rounded border border-red-800 bg-red-950/30 p-3 text-sm">
          <span className={colors.status.error}>{error}</span>
        </div>
      )}

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search title, path, or song…"
        className="mb-4 w-full rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 text-sm placeholder-neutral-600 focus:border-green-600 focus:outline-none"
      />

      {loading ? (
        <p className={`${colors.page.subtitle} text-sm`}>Loading...</p>
      ) : (
        <>
          <p
            className={`text-xs ${colors.page.count} mb-3 uppercase tracking-wider`}
          >
            {filtered.length} of {catalog.length} entries
          </p>
          <div className="space-y-2">
            {filtered.map((entry) => {
              const isEditing = editingId === entry.id;
              return (
                <div
                  key={entry.id}
                  className="space-y-2 rounded border border-neutral-800 p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    {isEditing ? (
                      <div className="flex-1 space-y-2">
                        <Field label="Title">
                          <input
                            value={editDraft.title}
                            onChange={(e) =>
                              setEditDraft((d) => ({
                                ...d,
                                title: e.target.value,
                              }))
                            }
                            className="w-full rounded border border-neutral-700 bg-neutral-900 px-2 py-1.5 text-neutral-100 text-sm focus:border-green-600 focus:outline-none"
                          />
                        </Field>
                        <Field label="Mix">
                          <input
                            value={editDraft.mix}
                            onChange={(e) =>
                              setEditDraft((d) => ({
                                ...d,
                                mix: e.target.value,
                              }))
                            }
                            className="w-full rounded border border-neutral-700 bg-neutral-900 px-2 py-1.5 text-neutral-100 text-sm focus:border-green-600 focus:outline-none"
                          />
                        </Field>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => saveEdit(entry.id)}
                            className={`px-2 text-xs ${colors.row.saveBtn} transition-colors`}
                          >
                            save
                          </button>
                          <button
                            type="button"
                            onClick={cancelEdit}
                            className={`px-2 text-xs ${colors.row.cancelBtn} transition-colors`}
                          >
                            cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className={`text-sm ${colors.row.value}`}>
                          {entry.title}
                        </div>
                        <div className={`text-xs ${colors.row.id} mt-0.5`}>
                          {entry.id}
                        </div>
                      </div>
                    )}
                    {!isEditing && (
                      <button
                        type="button"
                        onClick={() => startEdit(entry)}
                        className={`shrink-0 text-xs ${colors.row.editBtn} transition-colors`}
                      >
                        edit
                      </button>
                    )}
                  </div>

                  <Field label="Path">
                    <span className={colors.row.mono}>{entry.path}</span>
                  </Field>

                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Song">
                      <SongPicker
                        songs={songs}
                        loadState={songsLoad}
                        value={entry.songId}
                        onAssign={(song) => assignSong(entry, song)}
                        onSongCreated={(song) =>
                          setSongs((prev) => [...prev, song])
                        }
                      />
                    </Field>
                    {!isEditing && (
                      <Field label="Mix">
                        <span className={colors.row.value}>
                          {entry.mix || "—"}
                        </span>
                      </Field>
                    )}
                    <Field label="Stage (legacy, read-only)">
                      <span className={colors.row.value}>
                        {entry.stage || "—"}
                      </span>
                    </Field>
                    <Field label="Size">
                      <span className={colors.row.value}>
                        {sizeLabel(entry.size)}
                      </span>
                    </Field>
                    <Field label="Synced At">
                      <span className={colors.row.value}>
                        {entry.syncedAt
                          ? new Date(entry.syncedAt).toLocaleString()
                          : "—"}
                      </span>
                    </Field>
                    <Field label="Tags">
                      <TagChips
                        tags={entry.tags ?? []}
                        entityType="track"
                        suggestions={TRACK_TAG_SUGGESTIONS}
                        listId={`catalog-admin-tags-${entry.id}`}
                        onAdd={(tag) =>
                          patchTags(
                            entry,
                            Array.from(new Set([...(entry.tags ?? []), tag])),
                          )
                        }
                        onRemove={(tag) =>
                          patchTags(
                            entry,
                            (entry.tags ?? []).filter((t) => t !== tag),
                          )
                        }
                      />
                    </Field>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
