"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AssetCreateForm } from "@/components/AssetCreateForm";
import { assetClass, driveDocKind, inferAssetType } from "@/lib/asset";
import type { Asset, AssetSubtype } from "@/types";

/** element colors */
const colors = {
  page: {
    title: "text-neutral-100",
    subtitle: "text-neutral-500",
    navLink: "text-neutral-500 hover:text-neutral-300",
    fieldLabel: "text-neutral-500",
    count: "text-neutral-600",
  },
  status: {
    success: "text-green-400",
    error: "text-red-400",
  },
  row: {
    title: "text-neutral-100",
    url: "text-neutral-500 hover:text-neutral-300",
    kindBadge: "text-neutral-500",
    usage: "text-neutral-600",
    editBtn: "text-neutral-600 hover:text-green-400",
    deleteBtn: "text-neutral-600 hover:text-red-400",
    saveBtn: "text-green-500 hover:text-green-400",
    cancelBtn: "text-neutral-600 hover:text-neutral-400",
  },
};

const SUBTYPES: AssetSubtype[] = [
  "lyrics",
  "lyrics-stripped",
  "chord-chart",
  "press-release",
  "review",
  "post",
  "other",
];

type DraftAsset = {
  url: string;
  title: string;
  subtype: AssetSubtype;
};

const emptyDraft = (): DraftAsset => ({
  url: "",
  title: "",
  subtype: "lyrics",
});

export default function AdminAssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<DraftAsset>(emptyDraft());

  // biome-ignore lint/correctness/useExhaustiveDependencies: run once on mount; reload isn't memoized so listing it would re-fire every render.
  useEffect(() => {
    reload();
  }, []);

  async function reload() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/assets");
      if (!res.ok) throw new Error(`Failed to load: ${res.status}`);
      setAssets(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load assets");
    } finally {
      setLoading(false);
    }
  }

  const startEdit = (a: Asset) => {
    setEditingId(a.id);
    setEditDraft({ url: a.url, title: a.title, subtype: a.subtype });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDraft(emptyDraft());
  };

  const saveEdit = async (id: string) => {
    setError("");
    try {
      const res = await fetch(`/api/assets/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: editDraft.url.trim(),
          title: editDraft.title.trim(),
          subtype: editDraft.subtype,
          type: inferAssetType(editDraft.url.trim()),
        }),
      });
      if (!res.ok) throw new Error((await res.text()) || "Save failed");
      cancelEdit();
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    }
  };

  const remove = async (a: Asset) => {
    if (
      a.usageCount > 0 &&
      !confirm(
        `"${a.title}" is attached to ${a.usageCount} track(s). Delete anyway?`,
      )
    )
      return;
    setError("");
    try {
      const res = await fetch(`/api/assets/${a.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.text()) || "Delete failed");
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    }
  };

  return (
    <div className="max-w-3xl">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className={`text-2xl font-bold ${colors.page.title}`}>Assets</h1>
          <p className={`${colors.page.subtitle} text-sm mt-1`}>
            Documents and links the band attaches to tracks.
          </p>
        </div>
        <Link
          href="/admin"
          className={`${colors.page.navLink} text-xs transition-colors mt-1`}
        >
          ← Admin
        </Link>
      </div>

      {error && (
        <div className="mb-6 p-3 border border-red-800 bg-red-950/30 rounded text-sm">
          <span className={colors.status.error}>{error}</span>
        </div>
      )}

      <div className="mb-8 border border-neutral-800 rounded p-4">
        <p
          className={`text-xs ${colors.page.fieldLabel} uppercase tracking-wider mb-3`}
        >
          New asset
        </p>
        <AssetCreateForm onCreated={() => reload()} />
      </div>

      {loading ? (
        <p className={`${colors.page.subtitle} text-sm`}>Loading...</p>
      ) : (
        <>
          <p
            className={`text-xs ${colors.page.count} uppercase tracking-wider mb-3`}
          >
            {assets.length} asset{assets.length !== 1 ? "s" : ""}
          </p>
          <div className="space-y-2">
            {assets.map((a) => {
              const isEditing = editingId === a.id;
              return (
                <div
                  key={a.id}
                  className="border border-neutral-800 rounded p-3"
                >
                  {isEditing ? (
                    <div className="space-y-2">
                      <input
                        value={editDraft.url}
                        onChange={(e) =>
                          setEditDraft((d) => ({ ...d, url: e.target.value }))
                        }
                        className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1.5 text-xs text-neutral-100 focus:outline-none focus:border-green-600 font-mono"
                      />
                      <div className="flex gap-2">
                        <input
                          value={editDraft.title}
                          onChange={(e) =>
                            setEditDraft((d) => ({
                              ...d,
                              title: e.target.value,
                            }))
                          }
                          className="flex-1 bg-neutral-900 border border-neutral-700 rounded px-2 py-1.5 text-sm text-neutral-100 focus:outline-none focus:border-green-600"
                        />
                        <select
                          value={editDraft.subtype}
                          onChange={(e) =>
                            setEditDraft((d) => ({
                              ...d,
                              subtype: e.target.value as AssetSubtype,
                            }))
                          }
                          className="bg-neutral-900 border border-neutral-700 rounded px-2 py-1.5 text-sm text-neutral-100 focus:outline-none focus:border-green-600"
                        >
                          {SUBTYPES.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => saveEdit(a.id)}
                          className={`text-xs px-2 ${colors.row.saveBtn} transition-colors`}
                        >
                          save
                        </button>
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className={`text-xs px-2 ${colors.row.cancelBtn} transition-colors`}
                        >
                          cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <span
                        className={`text-xs border px-1.5 py-0.5 rounded shrink-0 uppercase tracking-wider ${assetClass(a.subtype)}`}
                      >
                        {a.subtype}
                      </span>
                      <div className="flex-1 min-w-0">
                        <a
                          href={a.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`text-sm block truncate ${colors.row.title} hover:underline`}
                        >
                          {a.title}
                        </a>
                        <div
                          className={`text-xs font-mono truncate ${colors.row.url}`}
                        >
                          {a.url}
                        </div>
                      </div>
                      <span
                        className={`text-xs ${colors.row.kindBadge} shrink-0`}
                      >
                        {a.type}
                        {driveDocKind(a.url) ? `·${driveDocKind(a.url)}` : ""}
                      </span>
                      <span
                        className={`text-xs ${colors.row.usage} tabular-nums shrink-0`}
                      >
                        used ×{a.usageCount}
                      </span>
                      <button
                        type="button"
                        onClick={() => startEdit(a)}
                        className={`text-xs ${colors.row.editBtn} transition-colors`}
                      >
                        edit
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(a)}
                        className={`text-xs ${colors.row.deleteBtn} transition-colors`}
                      >
                        ✕
                      </button>
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
