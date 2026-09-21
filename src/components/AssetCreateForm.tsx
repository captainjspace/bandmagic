"use client";

import { useState } from "react";
import { driveDocKind, inferAssetType } from "@/lib/asset";
import type { Asset, AssetSubtype } from "@/types";

/** element colors */
const colors = {
  fieldLabel: "text-neutral-500",
  error: "text-red-400",
  submit: "bg-green-600 hover:bg-green-500 text-black",
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

type Draft = { url: string; title: string; subtype: AssetSubtype };

const emptyDraft = (): Draft => ({ url: "", title: "", subtype: "lyrics" });

interface Props {
  onCreated: (asset: Asset) => void;
}

export function AssetCreateForm({ onCreated }: Props) {
  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.url.trim() || !draft.title.trim()) return;
    setCreating(true);
    setError("");
    try {
      const res = await fetch("/api/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: draft.url.trim(),
          title: draft.title.trim(),
          subtype: draft.subtype,
          type: inferAssetType(draft.url.trim()),
        }),
      });
      if (!res.ok) throw new Error((await res.text()) || "Create failed");
      const created = (await res.json()) as Asset;
      onCreated(created);
      setDraft(emptyDraft());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Create failed");
    } finally {
      setCreating(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <input
        value={draft.url}
        onChange={(e) => setDraft((d) => ({ ...d, url: e.target.value }))}
        required
        placeholder="https://docs.google.com/document/... or https://blog.example.com/..."
        className="w-full bg-neutral-950 border border-neutral-700 rounded px-3 py-2 text-sm text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-green-600 font-mono"
      />
      <div className="flex gap-2">
        <input
          value={draft.title}
          onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
          required
          placeholder="Display title"
          className="flex-1 bg-neutral-950 border border-neutral-700 rounded px-3 py-2 text-sm text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-green-600"
        />
        <select
          value={draft.subtype}
          onChange={(e) =>
            setDraft((d) => ({ ...d, subtype: e.target.value as AssetSubtype }))
          }
          className="bg-neutral-950 border border-neutral-700 rounded px-2 py-2 text-sm text-neutral-100 focus:outline-none focus:border-green-600"
        >
          {SUBTYPES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
      {draft.url.trim() && (
        <p className={`text-xs ${colors.fieldLabel}`}>
          inferred type:{" "}
          <span className="text-neutral-400">
            {inferAssetType(draft.url.trim())}
          </span>
          {driveDocKind(draft.url.trim()) && (
            <span className="text-neutral-500">
              {" "}
              · {driveDocKind(draft.url.trim())}
            </span>
          )}
        </p>
      )}
      {error && <p className={`text-xs ${colors.error}`}>{error}</p>}
      <button
        type="submit"
        disabled={creating || !draft.url.trim() || !draft.title.trim()}
        className={`w-full px-4 py-2 ${colors.submit} disabled:opacity-40 font-semibold text-sm rounded transition-colors`}
      >
        {creating ? "Saving..." : "Create"}
      </button>
    </form>
  );
}
