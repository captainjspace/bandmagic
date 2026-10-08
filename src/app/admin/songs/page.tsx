"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { TagChips } from "@/components/TagChips";
import type { Song } from "@/types";
import tagsTaxonomy from "../../../../tags.json";

const SONG_TAG_SUGGESTIONS = Object.keys(tagsTaxonomy.song?.tags ?? {});

/** element colors */
const colors = {
  page: {
    title: "text-rbblue-500",
    subtitle: "text-rbcyan-300",
    navLink: "text-rbyellow-500 hover:text-rbyellow-300",
    fieldLabel: "text-rbyellow-500",
    count: "text-rbyellow-600",
  },
  status: {
    error: "text-red-400",
  },
  row: {
    label: "text-rbyellow-600",
    value: "text-rbyellow-100",
    mono: "text-rbyellow-400 font-mono",
    id: "text-rbyellow-600 font-mono",
    audit: "text-rbyellow-600",
    editBtn: "text-rbyellow-600 hover:text-green-400",
    saveBtn: "text-green-500 hover:text-green-400",
    cancelBtn: "text-rbyellow-600 hover:text-rbyellow-400",
  },
};

type DraftSong = {
  name: string;
  aliases: string;
  folderPrefix: string;
  latestPath: string;
};

const emptyDraft = (): DraftSong => ({
  name: "",
  aliases: "",
  folderPrefix: "",
  latestPath: "",
});

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className={`text-xs ${colors.row.label} tracking-wider uppercase`}>
        {label}
      </p>
      <div className="mt-0.5 text-sm">{children}</div>
    </div>
  );
}

export default function AdminSongsPage() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<DraftSong>(emptyDraft());
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  // biome-ignore lint/correctness/useExhaustiveDependencies: run once on mount; reload isn't memoized so listing it would re-fire every render.
  useEffect(() => {
    reload();
  }, []);

  async function reload() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/songs");
      if (!res.ok) throw new Error(`Failed to load: ${res.status}`);
      setSongs(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load songs");
    } finally {
      setLoading(false);
    }
  }

  const createSong = async () => {
    if (!newName.trim() || creating) return;
    setCreating(true);
    setError("");
    try {
      const res = await fetch("/api/songs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });
      if (!res.ok) throw new Error((await res.text()) || "Create failed");
      setNewName("");
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Create failed");
    } finally {
      setCreating(false);
    }
  };

  const startEdit = (s: Song) => {
    setEditingId(s.id);
    setEditDraft({
      name: s.name,
      aliases: (s.aliases ?? []).join(", "),
      folderPrefix: s.folderPrefix ?? "",
      latestPath: s.latestPath ?? "",
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDraft(emptyDraft());
  };

  const saveEdit = async (id: string) => {
    setError("");
    try {
      const res = await fetch(`/api/songs/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editDraft.name.trim(),
          aliases: editDraft.aliases
            .split(",")
            .map((a) => a.trim())
            .filter(Boolean),
          folderPrefix: editDraft.folderPrefix.trim(),
          latestPath: editDraft.latestPath.trim(),
        }),
      });
      if (!res.ok) throw new Error((await res.text()) || "Save failed");
      cancelEdit();
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    }
  };

  const patchTags = async (song: Song, nextTags: string[]) => {
    setSongs((prev) =>
      prev.map((s) => (s.id === song.id ? { ...s, tags: nextTags } : s)),
    );
    await fetch(`/api/songs/${encodeURIComponent(song.id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tags: nextTags }),
    });
  };

  return (
    <div className="max-w-3xl">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className={`text-2xl font-bold ${colors.page.title}`}>Songs</h1>
          <p className={`${colors.page.subtitle} mt-1 text-sm`}>
            Edit the Song Firestore documents directly.
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

      <div className="border-rbyellow-800 mb-8 rounded border p-4">
        <p
          className={`text-xs ${colors.page.fieldLabel} mb-3 tracking-wider uppercase`}
        >
          New song
        </p>
        <div className="flex gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && createSong()}
            placeholder="Song name"
            className="border-rbyellow-700 bg-rbyellow-900 text-rbyellow-100 flex-1 rounded border px-2 py-1.5 text-sm focus:border-green-600 focus:outline-none"
          />
          <button
            type="button"
            onClick={createSong}
            disabled={!newName.trim() || creating}
            className="rounded bg-green-600 px-3 py-1.5 text-sm font-semibold text-black transition-colors hover:bg-green-500 disabled:opacity-40"
          >
            {creating ? "Creating…" : "Create"}
          </button>
        </div>
      </div>

      {loading ? (
        <p className={`${colors.page.subtitle} text-sm`}>Loading...</p>
      ) : (
        <>
          <p
            className={`text-xs ${colors.page.count} mb-3 tracking-wider uppercase`}
          >
            {songs.length} song{songs.length !== 1 ? "s" : ""}
          </p>
          <div className="space-y-2">
            {songs.map((s) => {
              const isEditing = editingId === s.id;
              return (
                <div
                  key={s.id}
                  className="border-rbyellow-800 rounded border p-3"
                >
                  {isEditing ? (
                    <div className="space-y-2">
                      <Field label="Name">
                        <input
                          value={editDraft.name}
                          onChange={(e) =>
                            setEditDraft((d) => ({
                              ...d,
                              name: e.target.value,
                            }))
                          }
                          className="border-rbyellow-700 bg-rbyellow-900 text-rbyellow-100 w-full rounded border px-2 py-1.5 text-sm focus:border-green-600 focus:outline-none"
                        />
                      </Field>
                      <Field label="Aliases (comma-separated)">
                        <input
                          value={editDraft.aliases}
                          onChange={(e) =>
                            setEditDraft((d) => ({
                              ...d,
                              aliases: e.target.value,
                            }))
                          }
                          className="border-rbyellow-700 bg-rbyellow-900 text-rbyellow-100 w-full rounded border px-2 py-1.5 text-sm focus:border-green-600 focus:outline-none"
                        />
                      </Field>
                      <Field label="Folder Prefix">
                        <input
                          value={editDraft.folderPrefix}
                          onChange={(e) =>
                            setEditDraft((d) => ({
                              ...d,
                              folderPrefix: e.target.value,
                            }))
                          }
                          className="border-rbyellow-700 bg-rbyellow-900 text-rbyellow-100 w-full rounded border px-2 py-1.5 font-mono text-sm focus:border-green-600 focus:outline-none"
                        />
                        <p className="mt-1 text-xs text-amber-500/80">
                          Changes where the app thinks this song's GCS folder is
                          — doesn't move anything in storage.
                        </p>
                      </Field>
                      <Field label="Latest Path">
                        <input
                          value={editDraft.latestPath}
                          onChange={(e) =>
                            setEditDraft((d) => ({
                              ...d,
                              latestPath: e.target.value,
                            }))
                          }
                          className="border-rbyellow-700 bg-rbyellow-900 text-rbyellow-100 w-full rounded border px-2 py-1.5 font-mono text-sm focus:border-green-600 focus:outline-none"
                        />
                      </Field>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => saveEdit(s.id)}
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
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className={`text-sm ${colors.row.value}`}>
                            {s.name}
                          </div>
                          <div className={`text-xs ${colors.row.id} mt-0.5`}>
                            {s.id}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => startEdit(s)}
                          className={`shrink-0 text-xs ${colors.row.editBtn} transition-colors`}
                        >
                          edit
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <Field label="Aliases">
                          <span className={colors.row.value}>
                            {(s.aliases ?? []).length > 0
                              ? s.aliases?.join(", ")
                              : "—"}
                          </span>
                        </Field>
                        <Field label="Folder Prefix">
                          <span className={colors.row.mono}>
                            {s.folderPrefix || "—"}
                          </span>
                        </Field>
                        <Field label="Latest Path">
                          <span className={colors.row.mono}>
                            {s.latestPath || "—"}
                          </span>
                        </Field>
                        <Field label="Tags">
                          <TagChips
                            tags={s.tags ?? []}
                            entityType="song"
                            suggestions={SONG_TAG_SUGGESTIONS}
                            listId={`song-admin-tags-${s.id}`}
                            onAdd={(tag) =>
                              patchTags(
                                s,
                                Array.from(new Set([...(s.tags ?? []), tag])),
                              )
                            }
                            onRemove={(tag) =>
                              patchTags(
                                s,
                                (s.tags ?? []).filter((t) => t !== tag),
                              )
                            }
                          />
                        </Field>
                      </div>
                      <p className={`text-xs ${colors.row.audit}`}>
                        Created by {s.createdBy} on{" "}
                        {new Date(s.createdAt).toLocaleDateString()} · Updated
                        by {s.updatedBy} on{" "}
                        {new Date(s.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
