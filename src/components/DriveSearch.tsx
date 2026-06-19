"use client";

import { useEffect, useState } from 'react';
import type { DriveFile } from '@/lib/drive';
import type { AssetSubtype } from '@/types';
import { inferSubtype } from '@/lib/filename-match';
import { assetClass } from '@/lib/asset';

/** element colors */
const colors = {
  input:   'text-neutral-100 placeholder-neutral-600',
  rowName: 'text-neutral-100',
  rowMeta: 'text-neutral-500',
  empty:   'text-neutral-600',
  error:   'text-red-400',
  loading: 'text-neutral-500',
  kindBadge: 'text-neutral-600',
};

export interface DriveSearchPick {
  url: string;
  title: string;
  subtype: AssetSubtype;
  file: DriveFile;
}

interface Props {
  onSelect: (pick: DriveSearchPick) => void;
  /** Optional initial query — useful when wiring from a context with a known term (e.g. track title). */
  initialQuery?: string;
  /** Optional mime-type filter (e.g. 'image/' prefix). Currently only equality; prefix matching is future work. */
  mimeType?: string;
  placeholder?: string;
}

function mimeKind(mt: string): string {
  if (mt.includes('document')) return 'doc';
  if (mt.includes('spreadsheet')) return 'sheet';
  if (mt.includes('presentation')) return 'slide';
  if (mt.includes('pdf')) return 'pdf';
  if (mt.startsWith('image/')) return 'image';
  if (mt.startsWith('audio/')) return 'audio';
  if (mt.startsWith('video/')) return 'video';
  return mt.split('/').pop() ?? mt;
}

export function DriveSearch({ onSelect, initialQuery = '', mimeType, placeholder }: Props) {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!query.trim()) return;
    const handle = setTimeout(async () => {
      setLoading(true);
      try {
        const url = `/api/drive/search?q=${encodeURIComponent(query)}${mimeType ? `&mimeType=${encodeURIComponent(mimeType)}` : ''}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Search failed: ${res.status}`);
        setResults(await res.json());
        setError('');
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Search failed');
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(handle);
  }, [query, mimeType]);

  // Display state derives from query + last-fetched results, so a cleared query shows nothing without needing setState.
  const displayResults = query.trim() ? results : [];
  const showEmpty = !loading && !error && query.trim() && results.length === 0;

  const pick = (file: DriveFile) => {
    onSelect({
      url: file.webViewLink,
      title: file.name,
      subtype: inferSubtype(file.name),
      file,
    });
  };

  return (
    <div className="space-y-2">
      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder={placeholder ?? 'Search your Drive…'}
        className={`w-full bg-neutral-950 border border-neutral-700 rounded px-2 py-1.5 text-sm ${colors.input} focus:outline-none focus:border-green-600`}
      />
      {loading && <p className={`text-xs ${colors.loading}`}>Searching…</p>}
      {error && <p className={`text-xs ${colors.error}`}>{error}</p>}
      {showEmpty && (
        <p className={`text-xs ${colors.empty}`}>No matches in your visible Drive.</p>
      )}
      {displayResults.length > 0 && (
        <ul className="max-h-56 overflow-y-auto border border-neutral-800 rounded">
          {displayResults.map(file => {
            const subtype = inferSubtype(file.name);
            return (
              <li key={file.id}>
                <button type="button" onClick={() => pick(file)}
                  className="w-full text-left px-2 py-1.5 hover:bg-neutral-800 transition-colors flex items-center gap-2">
                  <span className={`text-[10px] border px-1 py-0 rounded shrink-0 uppercase tracking-wider ${assetClass(subtype)}`}>
                    {subtype}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm truncate ${colors.rowName}`}>{file.name}</div>
                    <div className={`text-xs ${colors.rowMeta} truncate`}>
                      <span className={colors.kindBadge}>{mimeKind(file.mimeType)}</span>
                      {file.owners?.[0]?.emailAddress ? ` · ${file.owners[0].emailAddress}` : ''}
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
