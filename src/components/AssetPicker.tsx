"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import type { Asset, AssetSubtype } from "@/types";
import { assetClass, inferAssetType } from "@/lib/asset";
import { DriveSearch, type DriveSearchPick } from "@/components/DriveSearch";

/** element colors */
const colors = {
  trigger:    'text-neutral-600 hover:text-green-500',
  newLink:    'text-neutral-500 hover:text-green-400',
  searchText: 'text-neutral-100 placeholder-neutral-600',
  rowTitle:   'text-neutral-100',
  rowUrl:     'text-neutral-500',
  empty:      'text-neutral-600',
  modeToggle: 'text-neutral-500 hover:text-green-400',
  chip: {
    title:    'text-neutral-200',
    remove:   'text-neutral-600 hover:text-red-400',
    loading:  'text-neutral-500 border-neutral-700',
    error:    'text-amber-400 border-amber-800',
    missing:  'text-red-400 border-red-800',
  },
  create: {
    label:    'text-neutral-500',
    input:    'text-neutral-100 placeholder-neutral-600',
    submit:   'bg-green-600 hover:bg-green-500 text-black',
    cancel:   'text-neutral-500 hover:text-neutral-300',
    error:    'text-red-400',
    hint:     'text-neutral-600',
    tabIdle:  'text-neutral-500 hover:text-neutral-300',
    tabOn:    'bg-neutral-800 text-neutral-100',
  },
};

const SUBTYPES: AssetSubtype[] = [
  'lyrics', 'lyrics-stripped', 'chord-chart',
  'press-release', 'review', 'post', 'other',
];

export type AssetsLoadKind = 'loading' | 'loaded' | 'error';

interface Props {
  value: string[];
  onChange: (assetIds: string[]) => void;
  assets: Asset[];
  loadState: AssetsLoadKind;
  onAssetCreated: (asset: Asset) => void;
}

type Mode = 'search' | 'create';
type CreateSource = 'drive' | 'url';

export function AssetPicker({ value, onChange, assets, loadState, onAssetCreated }: Props) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>('search');
  const [query, setQuery] = useState("");

  const [createSource, setCreateSource] = useState<CreateSource>('drive');
  const [draftUrl, setDraftUrl] = useState("");
  const [draftTitle, setDraftTitle] = useState("");
  const [draftSubtype, setDraftSubtype] = useState<AssetSubtype>('lyrics');
  const [driveSeed, setDriveSeed] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [createError, setCreateError] = useState("");

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setMode('search');
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const openPicker = () => {
    setOpen(true);
    setMode('search');
  };

  const attach = (id: string) => {
    if (!value.includes(id)) onChange([...value, id]);
    setQuery("");
    setOpen(false);
  };
  const detach = (id: string) => onChange(value.filter(x => x !== id));

  const startCreate = () => {
    const q = query.trim();
    if (/^https?:\/\//i.test(q)) {
      setCreateSource('url');
      setDraftUrl(q);
      setDraftTitle("");
      setDriveSeed("");
    } else {
      setCreateSource('drive');
      setDraftUrl("");
      setDraftTitle("");
      setDriveSeed(q);
    }
    setDraftSubtype('lyrics');
    setCreateError("");
    setMode('create');
  };

  const onDrivePick = (pick: DriveSearchPick) => {
    setDraftUrl(pick.url);
    setDraftTitle(pick.title);
    setDraftSubtype(pick.subtype);
  };

  const cancelCreate = () => {
    setMode('search');
    setCreateError("");
  };

  const submitCreate = async () => {
    const url = draftUrl.trim();
    const title = draftTitle.trim();
    if (!url || !title || submitting) return;
    setSubmitting(true);
    setCreateError("");
    try {
      const res = await fetch('/api/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, title, subtype: draftSubtype, type: inferAssetType(url) }),
      });
      if (!res.ok) throw new Error(await res.text() || `Create failed: ${res.status}`);
      const created = (await res.json()) as Asset;
      onAssetCreated(created);
      onChange([...value, created.id]);
      setQuery("");
      setMode('search');
      setOpen(false);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Create failed');
    } finally {
      setSubmitting(false);
    }
  };

  const byId = new Map(assets.map(a => [a.id, a]));
  const unselected = assets.filter(a => !value.includes(a.id));
  const filtered = query.trim()
    ? unselected.filter(a =>
        a.title.toLowerCase().includes(query.toLowerCase()) ||
        a.subtype.toLowerCase().includes(query.toLowerCase()) ||
        a.url.toLowerCase().includes(query.toLowerCase()),
      )
    : unselected;

  return (
    <div ref={containerRef} className="space-y-1.5">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map(id => {
            if (loadState === 'loading') {
              return (
                <span key={id} className={`text-xs border rounded px-1.5 py-0.5 ${colors.chip.loading}`}>
                  loading…
                </span>
              );
            }
            if (loadState === 'error') {
              return (
                <span key={id} className={`text-xs border rounded px-1.5 py-0.5 ${colors.chip.error}`}>
                  load failed
                </span>
              );
            }
            const asset = byId.get(id);
            if (!asset) {
              return (
                <span key={id} className={`text-xs border rounded px-1.5 py-0.5 ${colors.chip.missing}`}>
                  missing: {id}
                  <button type="button" onClick={() => detach(id)}
                    className={`ml-1 ${colors.chip.remove}`}>✕</button>
                </span>
              );
            }
            return (
              <span key={asset.id}
                className={`text-xs border rounded px-1.5 py-0.5 inline-flex items-center gap-1.5 ${assetClass(asset.subtype)}`}>
                <span className="uppercase tracking-wider text-[10px]">{asset.subtype}</span>
                <span className={colors.chip.title}>{asset.title}</span>
                <button type="button" onClick={() => detach(asset.id)}
                  className={`${colors.chip.remove}`}>✕</button>
              </span>
            );
          })}
        </div>
      )}

      <div className="relative">
        <div className="flex items-center justify-between">
          <button type="button" onClick={openPicker}
            className={`text-xs ${colors.trigger} transition-colors`}>
            + Attach asset
          </button>
          <Link href="/admin/assets" target="_blank"
            className={`text-xs ${colors.newLink} transition-colors`}>
            Manage assets →
          </Link>
        </div>

        {open && (
          <div className="absolute z-50 top-full mt-1 w-full bg-neutral-900 border border-neutral-700 rounded shadow-xl">
            {mode === 'search' && (
              <>
                <div className="flex items-stretch border-b border-neutral-700">
                  <input
                    autoFocus
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder={
                      loadState === 'loading' ? 'Loading assets…' :
                      loadState === 'error' ? 'Asset list unavailable — Create new still works' :
                      'Search title, subtype, or URL…'
                    }
                    className={`flex-1 bg-neutral-900 rounded-tl px-3 py-2 text-sm ${colors.searchText} focus:outline-none`}
                  />
                  <button type="button" onClick={startCreate}
                    className={`text-xs px-3 ${colors.modeToggle} border-l border-neutral-700 transition-colors`}>
                    + Create new
                  </button>
                </div>
                {loadState === 'loaded' && filtered.length === 0 && (
                  <div className={`px-3 py-2 text-sm ${colors.empty}`}>
                    {assets.length === 0 ? "No assets yet — create one to attach it." : "No matches — try Create new."}
                  </div>
                )}
                {loadState === 'loaded' && filtered.length > 0 && (
                  <ul className="max-h-64 overflow-y-auto">
                    {filtered.map(asset => (
                      <li key={asset.id}>
                        <button type="button" onMouseDown={() => attach(asset.id)}
                          className="w-full text-left px-3 py-2 hover:bg-neutral-800 transition-colors flex items-center gap-3">
                          <span className={`text-xs border px-1.5 py-0.5 rounded shrink-0 uppercase tracking-wider ${assetClass(asset.subtype)}`}>
                            {asset.subtype}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className={`text-sm truncate ${colors.rowTitle}`}>{asset.title}</div>
                            <div className={`text-xs font-mono truncate ${colors.rowUrl}`}>{asset.url}</div>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}

            {mode === 'create' && (
              <div className="p-3 space-y-2"
                onKeyDown={e => {
                  if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'INPUT') {
                    e.preventDefault();
                    submitCreate();
                  }
                  if (e.key === 'Escape') { e.preventDefault(); cancelCreate(); }
                }}>
                <div className="flex items-center justify-between">
                  <p className={`text-xs ${colors.create.label} uppercase tracking-wider`}>New asset</p>
                  <div className="flex items-center gap-1 text-xs">
                    <button type="button" onClick={() => setCreateSource('drive')}
                      className={`px-2 py-0.5 rounded transition-colors ${createSource === 'drive' ? colors.create.tabOn : colors.create.tabIdle}`}>
                      Search Drive
                    </button>
                    <button type="button" onClick={() => setCreateSource('url')}
                      className={`px-2 py-0.5 rounded transition-colors ${createSource === 'url' ? colors.create.tabOn : colors.create.tabIdle}`}>
                      Paste URL
                    </button>
                  </div>
                </div>

                {createSource === 'drive' && (
                  <DriveSearch onSelect={onDrivePick} initialQuery={driveSeed} placeholder="Search your Drive…" />
                )}
                {createSource === 'url' && (
                  <input value={draftUrl} onChange={e => setDraftUrl(e.target.value)}
                    placeholder="https://docs.google.com/document/... or https://blog.example.com/..."
                    className={`w-full bg-neutral-950 border border-neutral-700 rounded px-2 py-1.5 text-xs ${colors.create.input} focus:outline-none focus:border-green-600 font-mono`} />
                )}

                <div className="flex gap-2">
                  <input value={draftTitle} onChange={e => setDraftTitle(e.target.value)}
                    placeholder="Display title"
                    className={`flex-1 bg-neutral-950 border border-neutral-700 rounded px-2 py-1.5 text-sm ${colors.create.input} focus:outline-none focus:border-green-600`} />
                  <select value={draftSubtype} onChange={e => setDraftSubtype(e.target.value as AssetSubtype)}
                    className={`bg-neutral-950 border border-neutral-700 rounded px-1.5 py-1.5 text-xs ${colors.create.input} focus:outline-none focus:border-green-600`}>
                    {SUBTYPES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                {draftUrl.trim() && (
                  <p className={`text-xs ${colors.create.hint}`}>
                    inferred type: <span className="text-neutral-400">{inferAssetType(draftUrl.trim())}</span>
                  </p>
                )}
                {createError && (
                  <p className={`text-xs ${colors.create.error}`}>{createError}</p>
                )}
                <div className="flex items-center justify-end gap-3 pt-1">
                  <button type="button" onClick={cancelCreate}
                    className={`text-xs ${colors.create.cancel} transition-colors`}>cancel</button>
                  <button type="button" onClick={submitCreate} disabled={submitting || !draftUrl.trim() || !draftTitle.trim()}
                    className={`text-xs px-3 py-1 ${colors.create.submit} disabled:opacity-40 rounded font-semibold transition-colors`}>
                    {submitting ? 'Creating...' : 'Create & attach'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
