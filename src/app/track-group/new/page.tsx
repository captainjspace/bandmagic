"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AssetPicker, type AssetsLoadKind } from "@/components/AssetPicker";
import { TrackSearch } from "@/components/TrackSearch";
import {
  assetLinkIds,
  assetLocationMap,
  reconcileAssetLinks,
  uid,
} from "@/lib/asset";
import type { Asset, AssetLink, CatalogEntry } from "@/types";

/** element colors */
const colors = {
  page: {
    title: "text-neutral-100",
    subtitle: "text-neutral-500",
    fieldLabel: "text-neutral-500",
    hint: "text-neutral-600",
    count: "text-neutral-600",
    navLink: "text-neutral-500 hover:text-neutral-300",
  },
  actions: {
    cancel:
      "border border-neutral-800 hover:border-red-700 text-neutral-400 hover:text-red-400 rounded px-3 py-1.5 transition-colors",
    draft:
      "border border-neutral-700 hover:border-neutral-500 text-neutral-200 rounded px-3 py-1.5 disabled:opacity-40 transition-colors",
    release:
      "bg-green-600 hover:bg-green-500 text-black font-semibold rounded px-3 py-1.5 disabled:opacity-40 transition-colors",
  },
  status: {
    success: "text-green-400",
    error: "text-red-400",
  },
  trackCard: {
    addBtn: "text-green-500 hover:text-green-400",
    removeBtn: "text-neutral-600 hover:text-red-400",
  },
  assets: {
    label: "text-neutral-600",
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
}

function newTrack(): TrackEntry {
  return { _id: uid(), path: "", title: "", stage: "mixing", assets: [] };
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
  const updateTrack = useCallback(
    (
      id: string,
      field: keyof Omit<TrackEntry, "_id" | "assets">,
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
            ? { ...t, path: entry.path, title: entry.title, stage: entry.stage }
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
          <p className={`${colors.page.subtitle} text-sm mt-1`}>
            Curate tracks and notify the band.
          </p>
        </div>
        <Link
          href="/admin"
          className={`${colors.page.navLink} text-xs mt-1 transition-colors`}
        >
          ← Admin
        </Link>
      </div>

      {status === "done" && (
        <div className="mb-6 p-3 border border-green-800 bg-green-950/30 rounded text-sm">
          <span className={colors.status.success}>
            TrackGroup created and band notified.
          </span>
        </div>
      )}
      {status === "error" && (
        <div className="mb-6 p-3 border border-red-800 bg-red-950/30 rounded text-sm">
          <span className={colors.status.error}>
            {errorMsg || "Something went wrong. Check the console."}
          </span>
        </div>
      )}
      {assetsLoad === "error" && (
        <div className="mb-6 p-3 border border-amber-800 bg-amber-950/30 rounded text-sm flex items-center justify-between">
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
              className={`block text-xs ${colors.page.fieldLabel} uppercase tracking-wider mb-1.5`}
            >
              <span>Title</span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:border-green-600"
                placeholder="June 2026 Rough Cuts"
              />
            </label>
          </div>
          <div>
            <label
              className={`block text-xs ${colors.page.fieldLabel} uppercase tracking-wider mb-1.5`}
            >
              <span>Description</span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:border-green-600 resize-none h-20"
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
          <div className="flex items-center justify-between mb-3">
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
            <button
              type="button"
              onClick={addTrack}
              className={`text-xs ${colors.trackCard.addBtn} transition-colors`}
            >
              + Add track
            </button>
          </div>
          <div className="space-y-3">
            {tracks.map((track) => (
              <div
                key={track._id}
                className={`border rounded p-3 space-y-2 ${track.path.trim() ? "border-neutral-800" : "border-neutral-800/50 opacity-60"}`}
              >
                <div className="flex gap-2">
                  <input
                    value={track.title}
                    onChange={(e) =>
                      updateTrack(track._id, "title", e.target.value)
                    }
                    className="flex-1 bg-neutral-900 border border-neutral-700 rounded px-2 py-1.5 text-sm text-neutral-100 focus:outline-none focus:border-green-600"
                    placeholder="Track title"
                  />
                  <select
                    value={track.stage}
                    onChange={(e) =>
                      updateTrack(track._id, "stage", e.target.value)
                    }
                    className="bg-neutral-900 border border-neutral-700 rounded px-2 py-1.5 text-sm text-neutral-100 focus:outline-none focus:border-green-600"
                  >
                    <option value="writing">writing</option>
                    <option value="tracking">tracking</option>
                    <option value="mixing">mixing</option>
                    <option value="mastering">mastering</option>
                  </select>
                  {tracks.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeTrack(track._id)}
                      className={`text-xs px-1 ${colors.trackCard.removeBtn} transition-colors`}
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
                <div className="border-t border-neutral-800/50 pt-2">
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
            <p className={`${colors.page.count} text-xs mt-2`}>
              {validTracks.length} track{validTracks.length !== 1 ? "s" : ""}{" "}
              will be included
            </p>
          )}
        </div>
      </form>
    </div>
  );
}
