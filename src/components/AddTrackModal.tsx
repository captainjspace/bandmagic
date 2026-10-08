"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/Modal";
import { SongPicker, type SongsLoadKind } from "@/components/SongPicker";
import type { CatalogEntry, Song } from "@/types";

const STAGES = ["writing", "tracking", "mixing", "mastering"] as const;
const AUDIO_ACCEPT = ".mp3,.wav,.flac,.aac,.ogg,.m4a";
const MAX_UPLOAD_BYTES = 32 * 1024 * 1024;

/** element colors */
const colors = {
  label: "text-rbcyan-500",
  changeSong: "text-rbcyan-500 hover:text-rbcyan-300",
  input: "text-rbcyan-100 placeholder-neutral-600",
  submit: "bg-green-600 hover:bg-green-500 text-black",
  error: "text-red-400",
  success: "text-green-400",
  tabIdle: "text-rbcyan-500 hover:text-rbcyan-300",
  tabOn: "bg-neutral-800 text-rbcyan-100",
  empty: "text-rbcyan-600",
};

type Mode = "upload" | "existing";
type CatalogLoadKind = "idle" | "loading" | "loaded" | "error";

interface Props {
  onClose: () => void;
}

export function AddTrackModal({ onClose }: Props) {
  const [songs, setSongs] = useState<Song[]>([]);
  const [songsLoad, setSongsLoad] = useState<SongsLoadKind>("loading");
  const [song, setSong] = useState<Song | null>(null);
  const [mode, setMode] = useState<Mode>("upload");

  // upload mode
  const [file, setFile] = useState<File | null>(null);
  const [stage, setStage] = useState<(typeof STAGES)[number]>("mixing");
  const [title, setTitle] = useState("");

  // existing mode
  const [unassigned, setUnassigned] = useState<CatalogEntry[]>([]);
  const [unassignedLoad, setUnassignedLoad] = useState<CatalogLoadKind>("idle");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetch("/api/songs")
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to load songs: ${r.status}`);
        return r.json();
      })
      .then((data: Song[]) => {
        setSongs(data);
        setSongsLoad("loaded");
      })
      .catch(() => setSongsLoad("error"));
  }, []);

  const loadUnassigned = () => {
    setUnassignedLoad("loading");
    fetch("/api/catalog")
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to load catalog: ${r.status}`);
        return r.json();
      })
      .then((data: CatalogEntry[]) => {
        setUnassigned(data.filter((e) => !e.songId));
        setUnassignedLoad("loaded");
      })
      .catch(() => setUnassignedLoad("error"));
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    setError("");
    setSuccess("");
    if (next === "existing" && unassignedLoad === "idle") loadUnassigned();
  };

  const resetAll = () => {
    setFile(null);
    setTitle("");
    setStage("mixing");
    setSelected(new Set());
    setQuery("");
    setError("");
  };

  const changeSong = () => {
    setSong(null);
    setMode("upload");
    resetAll();
    setSuccess("");
  };

  const toggleSelected = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const submitUpload = async () => {
    if (!song || !file) return;
    if (file.size > MAX_UPLOAD_BYTES) {
      setError("File exceeds the 32MB upload limit.");
      return;
    }
    setSubmitting(true);
    setError("");
    setSuccess("");
    try {
      const form = new FormData();
      form.set("file", file);
      form.set("songId", song.id);
      form.set("stage", stage);
      if (title.trim()) form.set("title", title.trim());

      const res = await fetch("/api/catalog", { method: "POST", body: form });
      if (!res.ok) throw new Error((await res.text()) || "Upload failed");

      setSuccess(`Added "${file.name}" to ${song.name}.`);
      resetAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setSubmitting(false);
    }
  };

  const submitExisting = async () => {
    if (!song || selected.size === 0) return;
    setSubmitting(true);
    setError("");
    setSuccess("");
    const ids = [...selected];
    try {
      const results = await Promise.all(
        ids.map((id) =>
          fetch(`/api/catalog/${encodeURIComponent(id)}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ songId: song.id }),
          }).then((r) => ({ id, ok: r.ok })),
        ),
      );
      const failed = results.filter((r) => !r.ok);
      const succeeded = results.length - failed.length;
      setUnassigned((prev) =>
        prev.filter(
          (e) => !selected.has(e.id) || failed.some((f) => f.id === e.id),
        ),
      );
      setSelected(new Set());
      if (failed.length === 0) {
        setSuccess(
          `Assigned ${succeeded} track${succeeded === 1 ? "" : "s"} to ${song.name}.`,
        );
      } else {
        setError(
          `${failed.length} track(s) failed to assign; ${succeeded} succeeded.`,
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Assign failed");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredUnassigned = query.trim()
    ? unassigned.filter(
        (e) =>
          e.title.toLowerCase().includes(query.toLowerCase()) ||
          e.path.toLowerCase().includes(query.toLowerCase()),
      )
    : unassigned;

  return (
    <Modal title="Add track" onClose={onClose}>
      <div className="space-y-3">
        <div>
          <p
            className={`text-xs ${colors.label} mb-1.5 uppercase tracking-wider`}
          >
            Song
          </p>
          {song ? (
            <div className="flex items-center gap-2 rounded border border-neutral-700 bg-neutral-950 px-3 py-2">
              <span className="flex-1 truncate text-rbcyan-100 text-sm">
                {song.name}
              </span>
              <button
                type="button"
                onClick={changeSong}
                className={`text-xs ${colors.changeSong} transition-colors`}
              >
                change
              </button>
            </div>
          ) : (
            <SongPicker
              songs={songs}
              loadState={songsLoad}
              onAssign={setSong}
              onSongCreated={(s) => setSongs((prev) => [...prev, s])}
            />
          )}
        </div>

        {song && (
          <>
            <div className="flex gap-1 border-neutral-800 border-b text-xs">
              <button
                type="button"
                onClick={() => switchMode("upload")}
                className={`rounded-t px-3 py-1.5 transition-colors ${mode === "upload" ? colors.tabOn : colors.tabIdle}`}
              >
                Upload new
              </button>
              <button
                type="button"
                onClick={() => switchMode("existing")}
                className={`rounded-t px-3 py-1.5 transition-colors ${mode === "existing" ? colors.tabOn : colors.tabIdle}`}
              >
                Pick existing
              </button>
            </div>

            {mode === "upload" && (
              <>
                <div>
                  <p
                    className={`text-xs ${colors.label} mb-1.5 uppercase tracking-wider`}
                  >
                    File
                  </p>
                  <input
                    type="file"
                    accept={AUDIO_ACCEPT}
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                    className="w-full text-rbcyan-300 text-sm file:mr-3 file:rounded file:border-0 file:bg-neutral-800 file:px-3 file:py-1.5 file:text-rbcyan-200 file:text-xs hover:file:bg-neutral-700"
                  />
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <p
                      className={`text-xs ${colors.label} mb-1.5 uppercase tracking-wider`}
                    >
                      Title
                    </p>
                    <input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder={file?.name ?? "Track title"}
                      className={`w-full rounded border border-neutral-700 bg-neutral-950 px-2 py-1.5 text-sm ${colors.input} focus:border-green-600 focus:outline-none`}
                    />
                  </div>
                  <div>
                    <p
                      className={`text-xs ${colors.label} mb-1.5 uppercase tracking-wider`}
                    >
                      Stage
                    </p>
                    <select
                      value={stage}
                      onChange={(e) =>
                        setStage(e.target.value as (typeof STAGES)[number])
                      }
                      className="rounded border border-neutral-700 bg-neutral-950 px-2 py-1.5 text-rbcyan-100 text-sm focus:border-green-600 focus:outline-none"
                    >
                      {STAGES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={submitUpload}
                  disabled={!file || submitting}
                  className={`w-full px-4 py-2 ${colors.submit} rounded font-semibold text-sm transition-colors disabled:opacity-40`}
                >
                  {submitting ? "Uploading..." : "Upload & add track"}
                </button>
              </>
            )}

            {mode === "existing" && (
              <>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={
                    unassignedLoad === "loading"
                      ? "Loading unclassified tracks…"
                      : "Search unclassified tracks…"
                  }
                  className={`w-full rounded border border-neutral-700 bg-neutral-950 px-2 py-1.5 text-sm ${colors.input} focus:border-green-600 focus:outline-none`}
                />
                {unassignedLoad === "error" && (
                  <p className={`text-xs ${colors.error}`}>
                    Couldn't load the catalog.
                  </p>
                )}
                {unassignedLoad === "loaded" &&
                  filteredUnassigned.length === 0 && (
                    <p className={`text-xs ${colors.empty}`}>
                      {unassigned.length === 0
                        ? "No unclassified tracks — everything's already assigned."
                        : "No matches."}
                    </p>
                  )}
                {filteredUnassigned.length > 0 && (
                  <ul className="max-h-48 divide-y divide-neutral-800 overflow-y-auto rounded border border-neutral-800">
                    {filteredUnassigned.map((entry) => (
                      <li key={entry.id}>
                        <label className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm hover:bg-neutral-800">
                          <input
                            type="checkbox"
                            checked={selected.has(entry.id)}
                            onChange={() => toggleSelected(entry.id)}
                            className="shrink-0"
                          />
                          <span className="flex-1 truncate text-rbcyan-100">
                            {entry.title}
                          </span>
                          <span className="shrink-0 text-rbcyan-600 text-xs">
                            {entry.stage}
                          </span>
                        </label>
                      </li>
                    ))}
                  </ul>
                )}

                <button
                  type="button"
                  onClick={submitExisting}
                  disabled={selected.size === 0 || submitting}
                  className={`w-full px-4 py-2 ${colors.submit} rounded font-semibold text-sm transition-colors disabled:opacity-40`}
                >
                  {submitting
                    ? "Assigning..."
                    : `Assign ${selected.size || ""} track${selected.size === 1 ? "" : "s"}`.trim()}
                </button>
              </>
            )}

            {error && <p className={`text-xs ${colors.error}`}>{error}</p>}
            {success && (
              <p className={`text-xs ${colors.success}`}>{success}</p>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}
