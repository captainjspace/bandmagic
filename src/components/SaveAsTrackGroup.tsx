"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { TaggedTrack } from "@/lib/search";

/** Turns tag-search results into a new track group (no release email) and
 *  opens it, where tasks can be assigned; "active until" is on the list page. */
export function SaveAsTrackGroup({
  tag,
  tracks,
}: {
  tag: string;
  tracks: TaggedTrack[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState(`#${tag}`);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    setSaving(true);
    setError("");
    const res = await fetch("/api/track-groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim() || `#${tag}`,
        tags: [tag],
        notify: false,
        tracks: tracks.map(({ path, title, tags }) => ({ path, title, tags })),
      }),
    });
    if (!res.ok) {
      setSaving(false);
      setError(`Save failed (${res.status}).`);
      return;
    }
    router.push(`/track-group/${(await res.json()).id}`);
  };

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        aria-label="New track group title"
        className="rb-input sm:w-72"
      />
      <button
        type="button"
        onClick={save}
        disabled={saving || tracks.length === 0}
        className="rb-btn-secondary"
      >
        {saving ? "Saving…" : `Save ${tracks.length} as track group`}
      </button>
      {error && <p className="rb-text-error">{error}</p>}
    </div>
  );
}
