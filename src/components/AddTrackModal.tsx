"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/Modal";
import { SongPicker, type SongsLoadKind } from "@/components/SongPicker";
import type { CatalogEntry, Song } from "@/types";

const STAGES = ["writing", "tracking", "mixing", "mastering"] as const;
const AUDIO_ACCEPT = ".mp3,.wav,.flac,.aac,.ogg,.m4a";
const MAX_UPLOAD_BYTES = 32 * 1024 * 1024;

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
  /** path of an existing file the pending upload would overwrite */
  const [confirmReplace, setConfirmReplace] = useState<string | null>(null);

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
    setConfirmReplace(null);
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

  /** Same song + same filename = the upload would overwrite that file. */
  const findExistingPath = async (
    target: Song,
    name: string,
  ): Promise<string | null> => {
    const res = await fetch("/api/catalog");
    if (!res.ok) return null; // the server-side 409 guard still catches it
    const entries: CatalogEntry[] = await res.json();
    const hit = entries.find(
      (e) =>
        (e.songId === target.id ||
          (!!target.folderPrefix && e.path.startsWith(target.folderPrefix))) &&
        e.path.split("/").pop() === name,
    );
    return hit?.path ?? null;
  };

  const submitUpload = async (overwrite = false) => {
    if (!song || !file) return;
    if (file.size > MAX_UPLOAD_BYTES) {
      setError("File exceeds the 32MB upload limit.");
      return;
    }
    setSubmitting(true);
    setError("");
    setSuccess("");
    try {
      if (!overwrite) {
        const existing = await findExistingPath(song, file.name);
        if (existing) {
          setConfirmReplace(existing);
          return;
        }
      }
      const form = new FormData();
      form.set("file", file);
      form.set("songId", song.id);
      form.set("stage", stage);
      if (title.trim()) form.set("title", title.trim());
      if (overwrite) form.set("overwrite", "true");

      const res = await fetch("/api/catalog", { method: "POST", body: form });
      if (res.status === 409) {
        const body = await res.json().catch(() => ({}));
        setConfirmReplace(body.path ?? file.name);
        return;
      }
      if (res.status === 403 && overwrite) {
        throw new Error(
          "Replace isn't permitted yet — the app's storage role can't overwrite files (needs storage.objects.delete).",
        );
      }
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || "Upload failed");
      }

      setSuccess(
        `${overwrite ? "Replaced" : "Added"} "${file.name}" ${overwrite ? "in" : "to"} ${song.name}.`,
      );
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
          <p className={"rb-label mb-1.5"}>Song</p>
          {song ? (
            <div className="flex items-center gap-2 rounded border border-neutral-700 bg-neutral-950 px-3 py-2">
              <span className="text-rbcyan-100 flex-1 truncate text-sm">
                {song.name}
              </span>
              <button
                type="button"
                onClick={changeSong}
                className={"rb-nav-link"}
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
            <div className="flex gap-1 border-b border-neutral-800 text-xs">
              <button
                type="button"
                onClick={() => switchMode("upload")}
                className={mode === "upload" ? "rb-tab-on" : "rb-tab"}
              >
                Upload new
              </button>
              <button
                type="button"
                onClick={() => switchMode("existing")}
                className={mode === "existing" ? "rb-tab-on" : "rb-tab"}
              >
                Pick existing
              </button>
            </div>

            {mode === "upload" && (
              <>
                <div>
                  <p className={"rb-label mb-1.5"}>File</p>
                  <input
                    type="file"
                    accept={AUDIO_ACCEPT}
                    onChange={(e) => {
                      setFile(e.target.files?.[0] ?? null);
                      setConfirmReplace(null);
                    }}
                    className="text-rbcyan-300 file:text-rbcyan-200 w-full text-sm file:mr-3 file:rounded file:border-0 file:bg-neutral-800 file:px-3 file:py-1.5 file:text-xs hover:file:bg-neutral-700"
                  />
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <p className={"rb-label mb-1.5"}>Title</p>
                    <input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder={file?.name ?? "Track title"}
                      className={"rb-input"}
                    />
                  </div>
                  <div>
                    <p className={"rb-label mb-1.5"}>Stage</p>
                    <select
                      value={stage}
                      onChange={(e) =>
                        setStage(e.target.value as (typeof STAGES)[number])
                      }
                      className="rb-input w-auto"
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
                  onClick={() => submitUpload()}
                  disabled={!file || submitting || !!confirmReplace}
                  className={"rb-btn-primary"}
                >
                  {submitting ? "Uploading..." : "Upload & add track"}
                </button>

                {confirmReplace && (
                  <div role="alertdialog" className="rb-confirm">
                    <p className="text-sm font-semibold">
                      Are you sure you want to replace this track?
                    </p>
                    <p className="font-mono text-xs break-all">
                      {confirmReplace}
                    </p>
                    <p className="text-xs">
                      The audio file is overwritten. Tags, assets, and track
                      group links stay attached to it.
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setConfirmReplace(null);
                          submitUpload(true);
                        }}
                        disabled={submitting}
                        className="rb-btn-primary"
                      >
                        Replace
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmReplace(null)}
                        className="rb-btn-secondary"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
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
                  className={"rb-input"}
                />
                {unassignedLoad === "error" && (
                  <p className={"rb-text-error"}>Couldn't load the catalog.</p>
                )}
                {unassignedLoad === "loaded" &&
                  filteredUnassigned.length === 0 && (
                    <p className={"tg-meta"}>
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
                          <span className="text-rbcyan-100 flex-1 truncate">
                            {entry.title}
                          </span>
                          <span className="text-rbcyan-600 shrink-0 text-xs">
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
                  className={"rb-btn-primary"}
                >
                  {submitting
                    ? "Assigning..."
                    : `Assign ${selected.size || ""} track${selected.size === 1 ? "" : "s"}`.trim()}
                </button>
              </>
            )}

            {error && <p className={"rb-text-error"}>{error}</p>}
            {success && <p className={"rb-text-success"}>{success}</p>}
          </>
        )}
      </div>
    </Modal>
  );
}
