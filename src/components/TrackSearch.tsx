"use client";

import { useState, useEffect, useRef } from "react";
import type { CatalogEntry } from "@/types/index.js";
import { stageClass } from "@/lib/stage";

let _cache: CatalogEntry[] | null = null;

async function loadCatalog(): Promise<CatalogEntry[]> {
  try {
    const res = await fetch("/api/catalog");
    if (!res.ok) throw new Error(`Catalog fetch failed: ${res.status}`);
    const text = await res.text();
    if (!text) throw new Error("Empty response from catalog");
    _cache = JSON.parse(text);
    return _cache!;
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
    ? catalog.filter(e =>
        e.title.toLowerCase().includes(query.toLowerCase()) ||
        e.song.toLowerCase().includes(query.toLowerCase()) ||
        e.path.toLowerCase().includes(query.toLowerCase())
      )
    : catalog;

  if (value) {
    return (
      <div className="flex items-center gap-2 bg-neutral-900 border border-neutral-700 rounded px-2 py-1.5">
        <span className="flex-1 text-xs font-mono truncate">{value}</span>
        <button type="button" onClick={onClear}
          className="text-neutral-600 hover:text-red-400 text-xs shrink-0 transition-colors">✕</button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
        onFocus={handleFocus}
        placeholder={loading ? "Loading catalog..." : error ? error : "Search tracks…"}
        className={`w-full bg-neutral-900 border rounded px-2 py-1.5 text-sm placeholder-neutral-600 focus:outline-none ${error ? "border-red-700 placeholder-red-500" : "border-neutral-700 focus:border-green-600"}`}
      />
      {open && filtered.length > 0 && (
        <ul className="absolute z-50 bottom-full mb-1 w-full bg-neutral-900 border border-neutral-700 rounded shadow-xl max-h-64 overflow-y-auto">
          {filtered.map(entry => (
            <li key={entry.id}>
              <button
                type="button"
                onMouseDown={() => { onSelect(entry); setQuery(""); setOpen(false); }}
                className="w-full text-left px-3 py-2 hover:bg-neutral-800 transition-colors flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-neutral-100 truncate">{entry.title}</div>
                  <div className="text-xs text-neutral-500 font-mono truncate">{entry.path}</div>
                </div>
                <span className={`text-xs border px-1.5 py-0.5 rounded shrink-0 ${stageClass(entry.stage)}`}>
                  {entry.stage}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {open && !loading && catalog.length > 0 && filtered.length === 0 && (
        <div className="absolute z-50 bottom-full mb-1 w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-2 text-sm text-neutral-600">
          No matches
        </div>
      )}
    </div>
  );
}
