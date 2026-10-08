"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
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
import type { Asset, AssetLink, CatalogEntry } from "@/types";
import tagsTaxonomy from "../../../../tags.json";

const TRACK_TAG_SUGGESTIONS = Object.keys(tagsTaxonomy.track?.tags ?? {});

/** element colors */
const colors = {
  page: {
    title: "text-rbblue-500",
    subtitle: "text-rbcyan-200",
    fieldLabel: "text-rbcyan-500",
    hint: "text-rbred-200",
    count: "text-rbred-200",
    navLink: "text-2xl text-cyan-200  hover:text-rborange-600 rbpuff",
  },
  actions: {
    cancel:
      "border border-rbcyan-800 hover:border-red-700 text-rbyellow-400 hover:text-red-400 rounded px-3 py-1.5 transition-colors",
    draft:
      "border border-rbmist-700 hover:border-rbcyan-500 text-rborange-200 rounded px-3 py-1.5 disabled:opacity-40 transition-colors",
    release:
      "bg-green-600 hover:bg-green-500 text-black font-semibold rounded px-3 py-1.5 disabled:opacity-40 transition-colors",
  },
  status: {
    success: "text-green-400",
    error: "text-red-400",
  },
  trackCard: {
    addBtn: "text-green-500 hover:text-green-400",
    removeBtn: "text-rbred-200 hover:text-red-400",
  },
  assets: {
    label: "text-rbred-200",
    errorBanner: "text-amber-400",
    retryBtn: "text-amber-400 hover:text-amber-300 underline",
  },
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

export default function NewTrackGroupPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tracks, setTracks] = useState<TrackEntry[]>([newTrack()]);
  const [groupAssets, setGroupAssets] = useState<AssetLink[]>([]);
  const [status, setStatus] = useState<
    "idle" | "sending-draft" | "sending-release" | "done" | "error"
  >("idle");
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

  const addTrack = () => setTracks((prev) => [...prev, newTrack()]);
  const removeTrack = (id: string) =>
    setTracks((prev) => prev.filter((t) => t._id !== id));
  const moveTrack = (id: string, direction: -1 | 1) =>
    setTracks((prev) => {
      const idx = prev.findIndex((t) => t._id === id);
      const swapIdx = idx + direction;
      if (idx === -1 || swapIdx < 0 || swapIdx >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
      return next;
    });
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
  const setTrackTags = useCallback(
    (id: string, nextTags: string[]) =>
      setTracks((prev) =>
        prev.map((t) => (t._id === id ? { ...t, tags: nextTags } : t)),
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

  const cancel = () => {
    if (!confirm("Clear this form?")) return;
    setTitle("");
    setDescription("");
    setTracks([newTrack()]);
    setGroupAssets([]);
    setStatus("idle");
    setErrorMsg("");
  };

  const validTracks = tracks.filter((t) => t.path.trim());
  const locationMap = assetLocationMap(groupAssets, tracks);

  const submit = async (notify: boolean) => {
    if (!title.trim()) return;
    if (validTracks.length === 0) {
      setErrorMsg("Add at least one track with a GCS path.");
      setStatus("error");
      return;
    }

    setStatus(notify ? "sending-release" : "sending-draft");
    setErrorMsg("");

    const payload = {
      title: title.trim(),
      description: description.trim(),
      notify,
      assets: groupAssets,
      tracks: validTracks.map(({ _id: _, ...t }) => ({
        ...t,
        path: t.path.trim(),
        title: t.title.trim() || t.path.split("/").pop() || t.path,
      })),
    };

    try {
      const res = await fetch("/api/track-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(err || "Failed");
      }
      const created = await res.json();
      if (notify) {
        setStatus("done");
        setTitle("");
        setDescription("");
        setTracks([newTrack()]);
        setGroupAssets([]);
      } else if (created?.id) {
        router.push(`/admin/${created.id}`);
      } else {
        setStatus("done");
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong.");
      setStatus("error");
    }
  };

  const sending = status === "sending-draft" || status === "sending-release";
  const disabled = sending || !title.trim() || validTracks.length === 0;

  return (
    <div className="max-w-2xl">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className={`text-2xl font-bold ${colors.page.title}`}>
            New TrackGroup
          </h1>
          <p className={`${colors.page.subtitle} mt-1 text-sm`}>
            Curate tracks and notify the band.
          </p>
        </div>
        <Link
          href="/admin"
          className={`${colors.page.navLink} rbpuff rbdrop text-md mt-2 transition-colors`}
        >
          ← Admin
        </Link>
      </div>

      {status === "done" && (
        <div className="mb-6 rounded border border-green-800 bg-green-950/30 p-3 text-sm">
          <span className={colors.status.success}>
            TrackGroup created and band notified.
          </span>
        </div>
      )}
      {status === "error" && (
        <div className="mb-6 rounded border border-red-800 bg-red-950/30 p-3 text-sm">
          <span className={colors.status.error}>
            {errorMsg || "Something went wrong. Check the console."}
          </span>
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

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(true);
        }}
        className="space-y-6"
      >
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={cancel}
            disabled={sending}
            className={`text-xs ${colors.actions.cancel}`}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => submit(false)}
            disabled={disabled}
            className={`text-xs ${colors.actions.draft}`}
          >
            {status === "sending-draft" ? "Saving…" : "Save (Draft)"}
          </button>
          <button
            type="submit"
            disabled={disabled}
            className={`text-xs ${colors.actions.release}`}
          >
            {status === "sending-release"
              ? "Releasing…"
              : "Release + Notify Band"}
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label
              className={`block text-sm ${colors.page.fieldLabel} mb-2 tracking-wider uppercase`}
            >
              <span>Title</span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="border-rbmist-700 bg-rbpurple-900/25 text-rborange-100 w-full rounded border px-3 py-2 text-sm focus:border-green-600 focus:outline-none"
                placeholder="The Future of Music"
              />
            </label>
          </div>
          <div>
            <label
              className={`block text-sm ${colors.page.fieldLabel} mb-2 tracking-wider uppercase`}
            >
              <span>Description</span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="border-rbmist-700 bg-rbpurple-900/25 text-rborange-100 h-20 w-full resize-none rounded border px-3 py-2 text-sm focus:border-green-600 focus:outline-none"
                placeholder="What's in this trackGroup?"
              />
            </label>
          </div>
          <div>
            <p className={`text-xs ${colors.assets.label} mb-1.5`}>
              Track group assets (lyrics, press, etc. shared across the whole
              group)
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
          <div className="mb-3 flex items-center justify-between">
            <label
              className={`text-xs ${colors.page.fieldLabel} tracking-wider uppercase`}
            >
              Tracks
              {tracks.some((t) => !t.path.trim()) && (
                <span className={`ml-2 ${colors.page.hint} normal-case`}>
                  (empty rows will be skipped)
                </span>
              )}
            </label>
            <button
              type="button"
              onClick={addTrack}
              className={`text-xs ${colors.trackCard.addBtn} transition-colors`}
            >
              + Add track
            </button>
          </div>
          <div className="space-y-3">
            {tracks.map((track, idx) => (
              <div
                key={track._id}
                className={`space-y-2 rounded border p-3 ${track.path.trim() ? "border-rbcyan-800" : "border-rbcyan-800/50 opacity-60"}`}
              >
                <div className="flex gap-2">
                  <input
                    value={track.title}
                    onChange={(e) =>
                      updateTrack(track._id, "title", e.target.value)
                    }
                    className="border-rbmist-700 bg-rbpurple-900/25 text-rborange-100 flex-1 rounded border px-2 py-1.5 text-sm focus:border-green-600 focus:outline-none"
                    placeholder="Track title"
                  />
                  <TagChips
                    tags={track.tags}
                    entityType="track"
                    suggestions={TRACK_TAG_SUGGESTIONS}
                    listId={`track-tags-${track._id}`}
                    onAdd={(tag) =>
                      setTrackTags(
                        track._id,
                        Array.from(new Set([...track.tags, tag])),
                      )
                    }
                    onRemove={(tag) =>
                      setTrackTags(
                        track._id,
                        track.tags.filter((t) => t !== tag),
                      )
                    }
                  />
                  <button
                    type="button"
                    onClick={() => moveTrack(track._id, -1)}
                    disabled={idx === 0}
                    aria-label="Move track up"
                    title="Move up"
                    className={`px-1 text-xs ${colors.trackCard.addBtn} transition-colors disabled:opacity-30`}
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    onClick={() => moveTrack(track._id, 1)}
                    disabled={idx === tracks.length - 1}
                    aria-label="Move track down"
                    title="Move down"
                    className={`px-1 text-xs ${colors.trackCard.addBtn} transition-colors disabled:opacity-30`}
                  >
                    ▼
                  </button>
                  {tracks.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeTrack(track._id)}
                      className={`px-1 text-xs ${colors.trackCard.removeBtn} transition-colors`}
                    >
                      ✕
                    </button>
                  )}
                </div>
                <TrackSearch
                  value={track.path}
                  onSelect={(entry) => selectTrack(track._id, entry)}
                  onClear={() => clearTrack(track._id)}
                />
                <div className="border-rbcyan-800/50 border-t pt-2">
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
            ))}
          </div>
          {validTracks.length > 0 && (
            <p className={`${colors.page.count} mt-2 text-xs`}>
              {validTracks.length} track{validTracks.length !== 1 ? "s" : ""}{" "}
              will be included
            </p>
          )}
        </div>
      </form>
    </div>
  );
}
