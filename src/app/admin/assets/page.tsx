"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AssetCreateForm } from "@/components/AssetCreateForm";
import { assetClass, driveDocKind, inferAssetType } from "@/lib/asset";
import type { Asset, AssetSubtype } from "@/types";

/** element colors */
const colors = {
  page: {
    title: "test-rbblue-500",
    subtitle: "test-rborange-300",
    navLink: "test-rborange-500 hover:test-rborange-300",
    fieldLabel: "test-rbred-500",
    count: "test-rborange-600",
  },
  status: {
    success: "text-green-400",
    error: "text-red-400",
  },
  row: {
    title: "test-rbcyan-300",
    url: "test-rborange-500 hover:test-rbyellow-300",
    kindBadge: "test-rborange-500",
    usage: "test-rbred-500",
    editBtn: "test-rborange-300 hover:text-green-400",
    deleteBtn: "test-rbred-600 hover:text-red-400",
    saveBtn: "text-green-500 hover:text-green-400",
    cancelBtn: "test-rborange-700 hover:test-rbyellow-300",
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
          <h1 className={`font-bold text-2xl ${colors.page.title}`}>Assets</h1>
          <p className={`${colors.page.subtitle} mt-1 text-sm`}>
            Documents and links the band attaches to tracks.
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

      <div className="mb-8 rounded border border-neutral-800 p-4">
        <p
          className={`text-xs ${colors.page.fieldLabel} mb-3 uppercase tracking-wider`}
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
            className={`text-xs ${colors.page.count} mb-3 uppercase tracking-wider`}
          >
            {assets.length} asset{assets.length !== 1 ? "s" : ""}
          </p>
          <div className="space-y-2">
            {assets.map((a) => {
              const isEditing = editingId === a.id;
              return (
                <div
                  key={a.id}
                  className="rounded border border-neutral-800 p-3"
                >
                  {isEditing ? (
                    <div className="space-y-2">
                      <input
                        value={editDraft.url}
                        onChange={(e) =>
                          setEditDraft((d) => ({ ...d, url: e.target.value }))
                        }
                        className="w-full rounded border border-neutral-700 bg-neutral-900 px-2 py-1.5 font-mono text-neutral-100 text-xs focus:border-green-600 focus:outline-none"
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
                          className="flex-1 rounded border border-neutral-700 bg-neutral-900 px-2 py-1.5 text-neutral-100 text-sm focus:border-green-600 focus:outline-none"
                        />
                        <select
                          value={editDraft.subtype}
                          onChange={(e) =>
                            setEditDraft((d) => ({
                              ...d,
                              subtype: e.target.value as AssetSubtype,
                            }))
                          }
                          className="rounded border border-neutral-700 bg-neutral-900 px-2 py-1.5 text-neutral-100 text-sm focus:border-green-600 focus:outline-none"
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
                    <div className="flex items-center gap-3">
                      <span
                        className={`shrink-0 rounded border px-1.5 py-0.5 text-xs uppercase tracking-wider ${assetClass(a.subtype)}`}
                      >
                        {a.subtype}
                      </span>
                      <div className="min-w-0 flex-1">
                        <a
                          href={a.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`block truncate text-sm ${colors.row.title} hover:underline`}
                        >
                          {a.title}
                        </a>
                        <div
                          className={`truncate font-mono text-xs ${colors.row.url}`}
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
                        className={`text-xs ${colors.row.usage} shrink-0 tabular-nums`}
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
