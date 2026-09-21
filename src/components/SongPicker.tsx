"use client";

import { useEffect, useRef, useState } from "react";
import type { Song } from "@/types";

/** element colors */
const colors = {
  trigger: "text-neutral-600 hover:text-green-500",
  searchText: "text-neutral-100 placeholder-neutral-600",
  rowTitle: "text-neutral-100",
  empty: "text-neutral-600",
  modeToggle: "text-neutral-500 hover:text-green-400",
  create: {
    label: "text-neutral-500",
    input: "text-neutral-100 placeholder-neutral-600",
    submit: "bg-green-600 hover:bg-green-500 text-black",
    cancel: "text-neutral-500 hover:text-neutral-300",
    error: "text-red-400",
  },
};

export type SongsLoadKind = "loading" | "loaded" | "error";

interface Props {
  songs: Song[];
  loadState: SongsLoadKind;
  value?: string;
  onAssign: (song: Song) => void;
  onSongCreated: (song: Song) => void;
}

type Mode = "search" | "create";

export function SongPicker({
  songs,
  loadState,
  value,
  onAssign,
  onSongCreated,
}: Props) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("search");
  const [query, setQuery] = useState("");
  const [draftName, setDraftName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [createError, setCreateError] = useState("");

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setMode("search");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const openPicker = () => {
    setOpen(true);
    setMode("search");
  };

  const pick = (song: Song) => {
    onAssign(song);
    setQuery("");
    setOpen(false);
  };

  const startCreate = () => {
    setDraftName(query.trim());
    setCreateError("");
    setMode("create");
  };

  const cancelCreate = () => {
    setMode("search");
    setCreateError("");
  };

  const submitCreate = async () => {
    const name = draftName.trim();
    if (!name || submitting) return;
    setSubmitting(true);
    setCreateError("");
    try {
      const res = await fetch("/api/songs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok)
        throw new Error((await res.text()) || `Create failed: ${res.status}`);
      const created = (await res.json()) as Song;
      onSongCreated(created);
      onAssign(created);
      setQuery("");
      setMode("search");
      setOpen(false);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setSubmitting(false);
    }
  };

  const selectable = songs.filter((s) => s.id !== value);
  const filtered = query.trim()
    ? selectable.filter((s) =>
        s.name.toLowerCase().includes(query.toLowerCase()),
      )
    : selectable;

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        type="button"
        onClick={openPicker}
        className={`text-xs ${colors.trigger} transition-colors`}
      >
        assign song
      </button>

      {open && (
        <div className="absolute z-50 top-full mt-1 right-0 w-64 bg-neutral-900 border border-neutral-700 rounded shadow-xl">
          {mode === "search" && (
            <>
              <div className="flex items-stretch border-b border-neutral-700">
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={
                    loadState === "loading"
                      ? "Loading songs…"
                      : loadState === "error"
                        ? "Song list unavailable — Create new still works"
                        : "Search songs…"
                  }
                  className={`flex-1 bg-neutral-900 rounded-tl px-3 py-2 text-sm ${colors.searchText} focus:outline-none`}
                />
                <button
                  type="button"
                  onClick={startCreate}
                  className={`text-xs px-3 ${colors.modeToggle} border-l border-neutral-700 transition-colors`}
                >
                  + New
                </button>
              </div>
              {loadState === "loaded" && filtered.length === 0 && (
                <div className={`px-3 py-2 text-sm ${colors.empty}`}>
                  {selectable.length === 0
                    ? "No songs yet — create one."
                    : "No matches — try + New."}
                </div>
              )}
              {loadState === "loaded" && filtered.length > 0 && (
                <ul className="max-h-64 overflow-y-auto">
                  {filtered.map((song) => (
                    <li key={song.id}>
                      <button
                        type="button"
                        onMouseDown={() => pick(song)}
                        className={`w-full text-left px-3 py-2 hover:bg-neutral-800 transition-colors text-sm truncate ${colors.rowTitle}`}
                      >
                        {song.name}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}

          {mode === "create" && (
            <div
              className="p-3 space-y-2"
              onKeyDown={(e) => {
                if (
                  e.key === "Enter" &&
                  (e.target as HTMLElement).tagName !== "BUTTON"
                ) {
                  e.preventDefault();
                  submitCreate();
                }
                if (e.key === "Escape") {
                  e.preventDefault();
                  cancelCreate();
                }
              }}
            >
              <p
                className={`text-xs ${colors.create.label} uppercase tracking-wider`}
              >
                New song
              </p>
              <input
                autoFocus
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                placeholder="Song name"
                className={`w-full bg-neutral-950 border border-neutral-700 rounded px-2 py-1.5 text-sm ${colors.create.input} focus:outline-none focus:border-green-600`}
              />
              {createError && (
                <p className={`text-xs ${colors.create.error}`}>
                  {createError}
                </p>
              )}
              <div className="flex items-center justify-end gap-3 pt-1">
                <button
                  type="button"
                  onClick={cancelCreate}
                  className={`text-xs ${colors.create.cancel} transition-colors`}
                >
                  cancel
                </button>
                <button
                  type="button"
                  onClick={submitCreate}
                  disabled={submitting || !draftName.trim()}
                  className={`text-xs px-3 py-1 ${colors.create.submit} disabled:opacity-40 rounded font-semibold transition-colors`}
                >
                  {submitting ? "Creating..." : "Create & assign"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
