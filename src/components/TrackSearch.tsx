"use client";

import { useEffect, useRef, useState } from "react";
import { tagBgClass, tagClass } from "@/lib/tag";
import type { CatalogEntry } from "@/types/index.js";

let _cache: CatalogEntry[] | null = null;

async function loadCatalog(): Promise<CatalogEntry[]> {
  try {
    const res = await fetch("/api/catalog");
    if (!res.ok) throw new Error(`Catalog fetch failed: ${res.status}`);
    const text = await res.text();
    if (!text) throw new Error("Empty response from catalog");
    const parsed = JSON.parse(text) as CatalogEntry[];
    _cache = parsed;
    return parsed;
  } catch (e) {
    if (_cache) return _cache;
    throw e;
  }
}

interface Props {
  value: string;
  onSelect: (entry: CatalogEntry) => void;
  onClear: () => void;
}

export function TrackSearch({ value, onSelect, onClear }: Props) {
  const [query, setQuery] = useState("");
  const [catalog, setCatalog] = useState<CatalogEntry[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleFocus = async () => {
    if (catalog.length === 0) {
      setLoading(true);
      try {
        const entries = await loadCatalog();
        setCatalog(entries);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load catalog");
      } finally {
        setLoading(false);
      }
    }
    setOpen(true);
  };

  const filtered = query.trim()
    ? catalog.filter(
        (e) =>
          e.title.toLowerCase().includes(query.toLowerCase()) ||
          e.song.toLowerCase().includes(query.toLowerCase()) ||
          e.path.toLowerCase().includes(query.toLowerCase()),
      )
    : catalog;

  if (value) {
    return (
      <div className="border-rbviolet-500 flex items-center gap-2 rounded border bg-orange-500/15 px-2 py-1.5">
        <span className="flex-1 truncate font-mono text-xs">{value}</span>
        <button
          type="button"
          onClick={onClear}
          className="text-rbyellow-600 shrink-0 text-xs transition-colors hover:text-red-400"
        >
          ✕
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={handleFocus}
        placeholder={
          loading ? "Loading catalog..." : error ? error : "Search tracks…"
        }
        className={`bg-rbviolet-900/20 placeholder-rbyellow-700 w-full rounded border px-2 py-1.5 text-sm focus:outline-none ${error ? "border-red-700 placeholder-red-500" : "border-neutral-700 focus:border-green-600"}`}
      />
      {open && filtered.length > 0 && (
        <ul className="absolute bottom-full z-50 mb-1 max-h-64 w-full overflow-y-auto rounded border border-neutral-700 bg-neutral-900 shadow-xl">
          {filtered.map((entry) => {
            const hasTags = !!entry.tags && entry.tags.length > 0;
            const legacyStage =
              !hasTags && entry.stage && entry.stage !== "unknown"
                ? entry.stage
                : null;
            return (
              <li key={entry.id}>
                <button
                  type="button"
                  onMouseDown={() => {
                    onSelect(entry);
                    setQuery("");
                    setOpen(false);
                  }}
                  className="flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-neutral-800"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm text-neutral-100">
                      {entry.title}
                    </div>
                    <div className="truncate font-mono text-xs text-neutral-500">
                      {entry.path}
                    </div>
                  </div>
                  {hasTags && entry.tags && (
                    <span
                      title="Tag Chips"
                      className={`shrink-0 rounded border px-1.5 py-0.5 text-xs ${tagClass(entry.tags[0], "track")} ${tagBgClass(entry.tags[0], "track")}`}
                    >
                      {entry.tags[0]}
                      {entry.tags.length > 1
                        ? ` +${entry.tags.length - 1}`
                        : ""}
                    </span>
                  )}
                  {legacyStage && (
                    <span
                      title="Stage Chips (legacy — not yet migrated to a tag)"
                      className="border-rborange-400 text-gradient-yworange shrink-0 rounded border border-dashed px-1.5 py-0.5 text-xs"
                    >
                      {legacyStage}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {open && !loading && catalog.length > 0 && filtered.length === 0 && (
        <div className="absolute bottom-full z-50 mb-1 w-full rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-600">
          No matches
        </div>
      )}
    </div>
  );
}
