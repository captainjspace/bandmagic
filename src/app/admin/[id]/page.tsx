"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AssetPicker, type AssetsLoadKind } from "@/components/AssetPicker";
import { TagChips } from "@/components/TagChips";
import { TrackSearch } from "@/components/TrackSearch";
import {
  assetLinkIds,
  assetLocationMap,
  reconcileAssetLinks,
  uid,
} from "@/lib/asset";
import type { Asset, AssetLink, CatalogEntry, TrackGroup } from "@/types";
import tagsTaxonomy from "../../../../tags.json";

const TRACK_TAG_SUGGESTIONS = Object.keys(tagsTaxonomy.track?.tags ?? {});

/** element colors */
const colors = {
  page: {
    title: "test-rborange-100",
    trackGroupId: "test-rborange-500",
    navLink: "test-rborange-500 hover:test-rborange-300",
    fieldLabel: "test-rborange-500",
    hint: "test-rborange-600",
    count: "test-rborange-600",
  },
  status: {
    success: "text-green-400",
    successLink: "text-green-400 hover:text-green-300 underline",
    error: "text-red-400",
  },
  trackHeader: {
    addBtn:
      "border border-green-700 hover:border-green-500 text-green-400 hover:text-green-300 rounded px-3 py-1.5 transition-colors",
    saveBtn:
      "border border-neutral-700 hover:border-neutral-500 text-neutral-200 rounded px-3 py-1.5 disabled:opacity-40 transition-colors",
  },
  trackCard: {
    base: "border border-neutral-800",
    empty: "border border-neutral-800/50 opacity-60",
    justSaved: "border border-green-600",
    saveBtn:
      "text-green-500 hover:text-green-400 disabled:opacity-30 disabled:hover:text-green-500 transition-colors",
    removeBtn: "text-neutral-600 hover:text-red-400 transition-colors",
  },
  assets: {
    label: "text-rbred-500",
    errorBanner: "text-amber-400",
    retryBtn: "text-amber-400 hover:text-amber-300 underline",
  },
  sweep: {
    btn: "text-cyan-500 hover:text-green-400",
    btnBusy: "text-rbyellow-400",
    banner: "text-rbcyan-300",
    counts: "text-green-400",
    errors: "text-amber-400",
  },
};

type SweepResponse = {
  proposed: number;
  created: number;
  attached: number;
  errors: { trackPath: string; trackTitle: string; reason: string }[];
};

interface TrackEntry {
  _id: string;
  path: string;
  title: string;
  stage: string;
  assets: AssetLink[];
  tags: string[];
}

function newTrack(): TrackEntry {
  return {
    _id: uid(),
    path: "",
    title: "",
    stage: "mixing",
    assets: [],
    tags: [],
  };
}

function fromTrackGroup(trackGroup: TrackGroup): {
  title: string;
  description: string;
  tracks: TrackEntry[];
  assets: AssetLink[];
} {
  return {
    title: trackGroup.title,
    description: trackGroup.description ?? "",
    tracks:
      trackGroup.tracks.length > 0
        ? trackGroup.tracks.map((t) => ({
            _id: uid(),
            path: t.path,
            title: t.title,
            stage: t.stage ?? "mixing",
            assets: t.assets ?? [],
            tags: t.tags ?? [],
          }))
        : [newTrack()],
    assets: trackGroup.assets ?? [],
  };
}

export default function EditTrackGroupPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [trackGroupId, setTrackGroupId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tracks, setTracks] = useState<TrackEntry[]>([newTrack()]);
  const [savedTracks, setSavedTracks] = useState<TrackEntry[]>([]);
  const [groupAssets, setGroupAssets] = useState<AssetLink[]>([]);
  const [savingRowId, setSavingRowId] = useState<string | null>(null);
  const [justSavedId, setJustSavedId] = useState<string | null>(null);
  const [status, setStatus] = useState<
    "loading" | "idle" | "sending" | "done" | "error"
  >("loading");
  const [errorMsg, setErrorMsg] = useState("");

  const [userEmail, setUserEmail] = useState("");
  const [assets, setAssets] = useState<Asset[]>([]);
  const [assetsLoad, setAssetsLoad] = useState<AssetsLoadKind>("loading");
  const [assetsError, setAssetsError] = useState("");

  const fetchAssets = useCallback(async () => {
    try {
      const res = await fetch("/api/assets");
      if (!res.ok) throw new Error(`Failed to load assets: ${res.status}`);
      setAssets(await res.json());
      setAssetsLoad("loaded");
    } catch (e) {
      setAssetsError(e instanceof Error ? e.message : "Failed to load assets");
      setAssetsLoad("error");
    }
  }, []);

  const retryAssets = useCallback(() => {
    setAssetsLoad("loading");
    setAssetsError("");
    fetchAssets();
  }, [fetchAssets]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot fetch on mount; setState fires after await, not synchronously
  useEffect(() => {
    fetchAssets();
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setUserEmail(d.email ?? ""))
      .catch(() => {});
  }, [fetchAssets]);

  const handleAssetCreated = useCallback((asset: Asset) => {
    setAssets((prev) => [asset, ...prev]);
  }, []);

  const [sweepResult, setSweepResult] = useState<SweepResponse | null>(null);
  const [sweeping, setSweeping] = useState(false);

  const isBusy = savingRowId !== null || status === "sending" || sweeping;

  useEffect(() => {
    params.then(async ({ id }) => {
      setTrackGroupId(id);
      const res = await fetch(`/api/track-groups/${id}`);
      if (!res.ok) {
        setStatus("error");
        setErrorMsg("TrackGroup not found.");
        return;
      }
      const trackGroup: TrackGroup = await res.json();
      const { title, description, tracks, assets } = fromTrackGroup(trackGroup);
      setTitle(title);
      setDescription(description);
      setTracks(tracks);
      setSavedTracks(tracks);
      setGroupAssets(assets);
      setStatus("idle");
    });
  }, [params]);

  const addTrack = () => setTracks((prev) => [newTrack(), ...prev]);

  const stripIdAndTrim = (t: TrackEntry) => ({
    path: t.path.trim(),
    title: t.title.trim() || t.path.split("/").pop() || t.path,
    stage: t.stage,
    assets: t.assets,
    tags: t.tags,
  });

  const flashSaved = (id: string) => {
    setJustSavedId(id);
    setTimeout(
      () => setJustSavedId((curr) => (curr === id ? null : curr)),
      1000,
    );
  };

  const saveRow = async (id: string) => {
    const row = tracks.find((t) => t._id === id);
    if (!row?.path.trim() || isBusy) return;
    setSavingRowId(id);
    setErrorMsg("");
    try {
      const inBaseline = savedTracks.some((t) => t._id === id);
      const nextBaseline = inBaseline
        ? savedTracks.map((t) => (t._id === id ? row : t))
        : [...savedTracks, row];
      const payload = {
        tracks: nextBaseline.filter((t) => t.path.trim()).map(stripIdAndTrim),
      };
      const res = await fetch(`/api/track-groups/${trackGroupId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.text()) || "Failed");
      setSavedTracks(nextBaseline);
      setTracks((prev) => prev.map((t) => (t._id === id ? { ...row } : t)));
      flashSaved(id);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to save track.");
      setStatus("error");
    } finally {
      setSavingRowId(null);
    }
  };

  const deleteRow = async (id: string) => {
    const row = tracks.find((t) => t._id === id);
    const inBaseline = savedTracks.some((t) => t._id === id);
    if (!row) return;
    if (!inBaseline) {
      setTracks((prev) => prev.filter((t) => t._id !== id));
      return;
    }
    if (isBusy) return;
    if (!confirm(`Delete "${row.title || row.path}"?`)) return;
    setSavingRowId(id);
    setErrorMsg("");
    try {
      const nextBaseline = savedTracks.filter((t) => t._id !== id);
      const payload = {
        tracks: nextBaseline.filter((t) => t.path.trim()).map(stripIdAndTrim),
      };
      const res = await fetch(`/api/track-groups/${trackGroupId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.text()) || "Failed");
      setSavedTracks(nextBaseline);
      setTracks((prev) => prev.filter((t) => t._id !== id));
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Failed to delete track.",
      );
      setStatus("error");
    } finally {
      setSavingRowId(null);
    }
  };
  const moveTrack = async (id: string, direction: -1 | 1) => {
    const idx = tracks.findIndex((t) => t._id === id);
    const swapIdx = idx + direction;
    if (idx === -1 || swapIdx < 0 || swapIdx >= tracks.length || isBusy) return;
    const reordered = [...tracks];
    [reordered[idx], reordered[swapIdx]] = [reordered[swapIdx], reordered[idx]];
    setTracks(reordered);

    const validReordered = reordered.filter((t) => t.path.trim());
    if (validReordered.length === 0) return;

    setSavingRowId(id);
    setErrorMsg("");
    try {
      const payload = { tracks: validReordered.map(stripIdAndTrim) };
      const res = await fetch(`/api/track-groups/${trackGroupId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.text()) || "Failed");
      setSavedTracks(validReordered);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Failed to reorder tracks.",
      );
      setStatus("error");
    } finally {
      setSavingRowId(null);
    }
  };

  const patchTrackTags = async (id: string, nextTags: string[]) => {
    const updated = tracks.map((t) =>
      t._id === id ? { ...t, tags: nextTags } : t,
    );
    setTracks(updated);

    const validUpdated = updated.filter((t) => t.path.trim());
    if (validUpdated.length === 0) return;

    setSavingRowId(id);
    setErrorMsg("");
    try {
      const payload = { tracks: validUpdated.map(stripIdAndTrim) };
      const res = await fetch(`/api/track-groups/${trackGroupId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.text()) || "Failed");
      setSavedTracks(validUpdated);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to save tag.");
      setStatus("error");
    } finally {
      setSavingRowId(null);
    }
  };

  const updateTrack = useCallback(
    (
      id: string,
      field: keyof Omit<TrackEntry, "_id" | "assets" | "tags">,
      value: string,
    ) =>
      setTracks((prev) =>
        prev.map((t) => (t._id === id ? { ...t, [field]: value } : t)),
      ),
    [],
  );
  const selectTrack = useCallback(
    (id: string, entry: CatalogEntry) =>
      setTracks((prev) =>
        prev.map((t) =>
          t._id === id
            ? {
                ...t,
                path: entry.path,
                title: entry.title,
                stage: entry.stage,
                tags: entry.tags ?? [],
              }
            : t,
        ),
      ),
    [],
  );
  const clearTrack = useCallback(
    (id: string) =>
      setTracks((prev) =>
        prev.map((t) => (t._id === id ? { ...t, path: "", title: "" } : t)),
      ),
    [],
  );

  const setTrackAssetIds = useCallback(
    (id: string, ids: string[]) =>
      setTracks((prev) =>
        prev.map((t) =>
          t._id === id
            ? { ...t, assets: reconcileAssetLinks(t.assets, ids, userEmail) }
            : t,
        ),
      ),
    [userEmail],
  );
  const setGroupAssetIds = useCallback(
    (ids: string[]) =>
      setGroupAssets((prev) => reconcileAssetLinks(prev, ids, userEmail)),
    [userEmail],
  );

  const runSweep = async () => {
    if (!trackGroupId || isBusy) return;
    setSweeping(true);
    setSweepResult(null);
    try {
      const res = await fetch("/api/admin/sweep-drive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackGroupId }),
      });
      if (!res.ok) throw new Error((await res.text()) || "Sweep failed");
      const result: SweepResponse = await res.json();
      setSweepResult(result);
      await fetchAssets();
      const rel = await fetch(`/api/track-groups/${trackGroupId}`);
      if (rel.ok) {
        const trackGroup: TrackGroup = await rel.json();
        const refreshed = fromTrackGroup(trackGroup);
        setTracks(refreshed.tracks);
        setSavedTracks(refreshed.tracks);
        setGroupAssets(refreshed.assets);
      }
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Sweep failed");
      setStatus("error");
    } finally {
      setSweeping(false);
    }
  };

  const validTracks = tracks.filter((t) => t.path.trim());
  const locationMap = assetLocationMap(groupAssets, tracks);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || validTracks.length === 0 || isBusy) return;
    setStatus("sending");
    setErrorMsg("");

    const payload = {
      title: title.trim(),
      description: description.trim(),
      assets: groupAssets,
      tracks: validTracks.map(stripIdAndTrim),
    };

    try {
      const res = await fetch(`/api/track-groups/${trackGroupId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.text()) || "Failed");
      setSavedTracks(validTracks);
      setStatus("done");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong.");
      setStatus("error");
    }
  };

  if (status === "loading") {
    return <p className={`${colors.page.trackGroupId} text-sm`}>Loading...</p>;
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className={`font-bold text-2xl ${colors.page.title}`}>
            Edit TrackGroup
          </h1>
          <p className={`${colors.page.trackGroupId} mt-1 font-mono text-xs`}>
            {trackGroupId}
          </p>
        </div>
        <div className="mt-1 flex items-center gap-3">
          <button
            type="button"
            onClick={runSweep}
            disabled={isBusy}
            className={`text-xs ${sweeping ? colors.sweep.btnBusy : colors.sweep.btn} transition-colors disabled:opacity-60`}
          >
            {sweeping ? "Sweeping…" : "↻ Sweep Drive"}
          </button>
          <Link
            href="/admin/assets"
            className={`${colors.page.navLink} text-xs transition-colors`}
          >
            Assets
          </Link>
          <Link
            href={`/track-group/${trackGroupId}`}
            className={`${colors.page.navLink} text-xs transition-colors`}
          >
            ← Back to track group
          </Link>
        </div>
      </div>

      {status === "done" && (
        <div className="mb-6 rounded border border-green-800 bg-green-950/30 p-3 text-sm">
          <span className={colors.status.success}>Saved. </span>
          <Link
            href={`/track-group/${trackGroupId}`}
            className={colors.status.successLink}
          >
            View track group →
          </Link>
        </div>
      )}
      {status === "error" && (
        <div className="mb-6 rounded border border-red-800 bg-red-950/30 p-3 text-sm">
          <span className={colors.status.error}>{errorMsg}</span>
        </div>
      )}
      {assetsLoad === "error" && (
        <div className="mb-6 flex items-center justify-between rounded border border-amber-800 bg-amber-950/30 p-3 text-sm">
          <span className={colors.assets.errorBanner}>
            Asset list unavailable — {assetsError}
          </span>
          <button
            type="button"
            onClick={retryAssets}
            className={`${colors.assets.retryBtn} text-xs transition-colors`}
          >
            Retry
          </button>
        </div>
      )}
      {sweepResult && (
        <div className="mb-6 space-y-1 rounded border border-neutral-800 bg-neutral-900/50 p-3 text-sm">
          <p className={colors.sweep.banner}>
            Drive sweep —{" "}
            <span className={colors.sweep.counts}>
              {sweepResult.proposed} proposed · {sweepResult.created} created ·{" "}
              {sweepResult.attached} attached
            </span>
          </p>
          {sweepResult.errors.length > 0 && (
            <ul
              className={`text-xs ${colors.sweep.errors} list-inside list-disc`}
            >
              {sweepResult.errors.map((e) => (
                <li key={`${e.trackTitle || "(trackGroup)"}-${e.reason}`}>
                  {e.trackTitle || "(trackGroup)"}: {e.reason}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <form onSubmit={submit} className="space-y-6">
        <div className="space-y-4">
          <div>
            <label
              className={`block text-xs ${colors.page.fieldLabel} mb-1.5 uppercase tracking-wider`}
            >
              Title
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 text-sm focus:border-green-600 focus:outline-none"
            />
          </div>
          <div>
            <label
              className={`block text-xs ${colors.page.fieldLabel} mb-1.5 uppercase tracking-wider`}
            >
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="h-20 w-full resize-none rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 text-sm focus:border-green-600 focus:outline-none"
            />
          </div>
          <div>
            <p className={`text-xs ${colors.assets.label} mb-1.5`}>
              Track group assets (shared across the whole group)
            </p>
            <AssetPicker
              value={assetLinkIds(groupAssets)}
              onChange={setGroupAssetIds}
              assets={assets}
              loadState={assetsLoad}
              onAssetCreated={handleAssetCreated}
              alreadyLinkedElsewhere={locationMap}
            />
          </div>
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between gap-3">
            <label
              className={`text-xs ${colors.page.fieldLabel} uppercase tracking-wider`}
            >
              Tracks
              {tracks.some((t) => !t.path.trim()) && (
                <span className={`ml-2 ${colors.page.hint} normal-case`}>
                  (empty rows will be skipped)
                </span>
              )}
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={addTrack}
                disabled={isBusy}
                className={`text-xs ${colors.trackHeader.addBtn} disabled:opacity-40`}
              >
                + Add Track
              </button>
              <button
                type="submit"
                disabled={isBusy || !title.trim() || validTracks.length === 0}
                className={`text-xs ${colors.trackHeader.saveBtn}`}
              >
                {status === "sending" ? "Saving…" : "Save track group"}
              </button>
            </div>
          </div>
          <div className="space-y-3">
            {tracks.map((track, idx) => {
              const cardBorder =
                justSavedId === track._id
                  ? colors.trackCard.justSaved
                  : track.path.trim()
                    ? colors.trackCard.base
                    : colors.trackCard.empty;
              const rowBusy = savingRowId === track._id;
              return (
                <div
                  key={track._id}
                  className={`${cardBorder} space-y-2 rounded p-3 transition-colors duration-500`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      value={track.title}
                      onChange={(e) =>
                        updateTrack(track._id, "title", e.target.value)
                      }
                      className="flex-1 rounded border border-neutral-700 bg-neutral-900 px-2 py-1.5 text-neutral-100 text-sm focus:border-green-600 focus:outline-none"
                      placeholder="Track title"
                    />
                    {track.tags.length > 0 && (
                      <span className="text-neutral-600 text-xs">
                        Tag Chips:
                      </span>
                    )}
                    <TagChips
                      tags={track.tags}
                      entityType="track"
                      suggestions={TRACK_TAG_SUGGESTIONS}
                      listId={`track-tags-${track._id}`}
                      onAdd={(tag) =>
                        patchTrackTags(
                          track._id,
                          Array.from(new Set([...track.tags, tag])),
                        )
                      }
                      onRemove={(tag) =>
                        patchTrackTags(
                          track._id,
                          track.tags.filter((t) => t !== tag),
                        )
                      }
                    />
                    {track.tags.length === 0 &&
                      track.stage &&
                      track.stage !== "unknown" && (
                        <>
                          <span className="text-neutral-600 text-xs">
                            Stage Chips:
                          </span>
                          <span
                            title="Legacy stage value from before tagging existed — not yet migrated to a tag."
                            className="rounded border border-neutral-700 border-dashed px-2 py-0.5 text-neutral-500 text-xs"
                          >
                            {track.stage}
                          </span>
                        </>
                      )}
                    <button
                      type="button"
                      onClick={() => moveTrack(track._id, -1)}
                      disabled={idx === 0 || isBusy}
                      aria-label="Move track up"
                      title="Move up"
                      className={`px-1 text-base ${colors.trackCard.saveBtn} disabled:opacity-30`}
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      onClick={() => moveTrack(track._id, 1)}
                      disabled={idx === tracks.length - 1 || isBusy}
                      aria-label="Move track down"
                      title="Move down"
                      className={`px-1 text-base ${colors.trackCard.saveBtn} disabled:opacity-30`}
                    >
                      ▼
                    </button>
                    <button
                      type="button"
                      onClick={() => saveRow(track._id)}
                      disabled={!track.path.trim() || isBusy}
                      aria-label="Save this track"
                      title="Save this track only"
                      className={`px-1 text-base ${colors.trackCard.saveBtn}`}
                    >
                      {rowBusy ? "…" : "✓"}
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteRow(track._id)}
                      disabled={isBusy}
                      aria-label="Delete this track"
                      title="Delete this track"
                      className={`px-1 text-base ${colors.trackCard.removeBtn} disabled:opacity-30`}
                    >
                      ✕
                    </button>
                  </div>
                  <TrackSearch
                    value={track.path}
                    onSelect={(entry) => selectTrack(track._id, entry)}
                    onClear={() => clearTrack(track._id)}
                  />
                  <div className="border-neutral-800/50 border-t pt-2">
                    <p className={`text-xs ${colors.assets.label} mb-1.5`}>
                      Assets
                    </p>
                    <AssetPicker
                      value={assetLinkIds(track.assets)}
                      onChange={(ids) => setTrackAssetIds(track._id, ids)}
                      assets={assets}
                      loadState={assetsLoad}
                      onAssetCreated={handleAssetCreated}
                      alreadyLinkedElsewhere={locationMap}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          {validTracks.length > 0 && (
            <p className={`${colors.page.count} mt-2 text-xs`}>
              {validTracks.length} track{validTracks.length !== 1 ? "s" : ""}{" "}
              will be saved
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isBusy || !title.trim() || validTracks.length === 0}
          className="w-full rounded bg-green-600 py-2.5 font-semibold text-black text-sm transition-colors hover:bg-green-500 disabled:opacity-40"
        >
          {status === "sending" ? "Saving..." : "Save Changes"}
        </button>
      </form>
    </div>
  );
}
