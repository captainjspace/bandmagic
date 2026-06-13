'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { TrackSearch } from '@/components/TrackSearch';
import type { CatalogEntry, DocLink } from '@/types';

/** element colors */
const colors = {
  page: {
    title:      'text-neutral-100',
    subtitle:   'text-neutral-500',
    navLink:    'text-neutral-500 hover:text-neutral-300',
    syncBtn:    'text-neutral-600 hover:text-neutral-400',
    fieldLabel: 'text-neutral-500',
    hint:       'text-neutral-600',
    count:      'text-neutral-600',
  },
  status: {
    success: 'text-green-400',
    error:   'text-red-400',
  },
  trackCard: {
    addBtn:    'text-green-500 hover:text-green-400',
    removeBtn: 'text-neutral-600 hover:text-red-400',
  },
  docLinks: {
    label:     'text-neutral-600',
    typeSelect:'text-neutral-400',
    input:     'text-neutral-300',
    addBtn:    'text-neutral-600 hover:text-green-500',
    removeBtn: 'text-neutral-600 hover:text-red-400',
  },
};

interface TrackEntry {
  _id: string;
  path: string;
  title: string;
  stage: string;
  docLinks: DocLink[];
}

const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

function newTrack(): TrackEntry {
  return { _id: uid(), path: '', title: '', stage: 'mixing', docLinks: [] };
}

export default function AdminPage() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tracks, setTracks] = useState<TrackEntry[]>([newTrack()]);
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const addTrack = () => setTracks(prev => [...prev, newTrack()]);
  const removeTrack = (id: string) => setTracks(prev => prev.filter(t => t._id !== id));
  const updateTrack = useCallback((id: string, field: keyof Omit<TrackEntry, '_id' | 'docLinks'>, value: string) =>
    setTracks(prev => prev.map(t => t._id === id ? { ...t, [field]: value } : t)), []);
  const selectTrack = useCallback((id: string, entry: CatalogEntry) =>
    setTracks(prev => prev.map(t => t._id === id
      ? { ...t, path: entry.path, title: entry.title, stage: entry.stage }
      : t)), []);
  const clearTrack = useCallback((id: string) =>
    setTracks(prev => prev.map(t => t._id === id ? { ...t, path: '', title: '' } : t)), []);

  const addDocLink = useCallback((id: string) =>
    setTracks(prev => prev.map(t => t._id === id
      ? { ...t, docLinks: [...t.docLinks, { type: 'other' as const, title: '', url: '' }] }
      : t)), []);
  const removeDocLink = useCallback((id: string, idx: number) =>
    setTracks(prev => prev.map(t => t._id === id
      ? { ...t, docLinks: t.docLinks.filter((_, i) => i !== idx) }
      : t)), []);
  const updateDocLink = useCallback((id: string, idx: number, field: keyof DocLink, value: string) =>
    setTracks(prev => prev.map(t => t._id === id
      ? { ...t, docLinks: t.docLinks.map((l, i) => i === idx ? { ...l, [field]: value } : l) }
      : t)), []);

  const sync = async () => {
    await fetch('/api/admin/sync', { method: 'POST' });
  };

  const validTracks = tracks.filter(t => t.path.trim());

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    if (validTracks.length === 0) {
      setErrorMsg('Add at least one track with a GCS path.');
      setStatus('error');
      return;
    }

    setStatus('sending');
    setErrorMsg('');

    const payload = {
      title: title.trim(),
      description: description.trim(),
      tracks: validTracks.map(({ _id: _, ...t }) => ({
        ...t,
        path: t.path.trim(),
        title: t.title.trim() || t.path.split('/').pop() || t.path,
        docLinks: t.docLinks.filter(l => l.url.trim()),
      })),
    };

    try {
      const res = await fetch('/api/releases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(err || 'Failed');
      }
      setStatus('done');
      setTitle('');
      setDescription('');
      setTracks([newTrack()]);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong.');
      setStatus('error');
    }
  };

  return (
    <div className="max-w-2xl">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className={`text-2xl font-bold ${colors.page.title}`}>New Release</h1>
          <p className={`${colors.page.subtitle} text-sm mt-1`}>Curate tracks and notify the band.</p>
        </div>
        <div className="flex items-center gap-3 mt-1">
          <button type="button" onClick={sync}
            className={`text-xs ${colors.page.syncBtn} transition-colors`}>↻ Sync catalog</button>
          <Link href="/" className={`${colors.page.navLink} text-xs transition-colors`}>← Releases</Link>
        </div>
      </div>

      {status === 'done' && (
        <div className="mb-6 p-3 border border-green-800 bg-green-950/30 rounded text-sm">
          <span className={colors.status.success}>Release created and band notified.</span>
        </div>
      )}
      {status === 'error' && (
        <div className="mb-6 p-3 border border-red-800 bg-red-950/30 rounded text-sm">
          <span className={colors.status.error}>{errorMsg || 'Something went wrong. Check the console.'}</span>
        </div>
      )}

      <form onSubmit={submit} className="space-y-6">
        <button type="submit" disabled={status === 'sending' || !title.trim() || validTracks.length === 0}
          className="w-full py-2.5 bg-green-600 hover:bg-green-500 disabled:opacity-40 text-black font-semibold text-sm rounded transition-colors">
          {status === 'sending' ? 'Releasing...' : 'Release + Notify Band'}
        </button>

        <div className="space-y-4">
          <div>
            <label className={`block text-xs ${colors.page.fieldLabel} uppercase tracking-wider mb-1.5`}>
              <span>Title</span>
              <input value={title} onChange={e => setTitle(e.target.value)} required
                className="w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:border-green-600"
                placeholder="June 2026 Rough Cuts" />
            </label>
          </div>
          <div>
            <label className={`block text-xs ${colors.page.fieldLabel} uppercase tracking-wider mb-1.5`}>
              <span>Description</span>
              <textarea value={description} onChange={e => setDescription(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:border-green-600 resize-none h-20"
                placeholder="What's in this release?" />
            </label>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <label className={`text-xs ${colors.page.fieldLabel} uppercase tracking-wider`}>
              Tracks
              {tracks.some(t => !t.path.trim()) && (
                <span className={`ml-2 ${colors.page.hint} normal-case`}>(empty rows will be skipped)</span>
              )}
            </label>
            <button type="button" onClick={addTrack}
              className={`text-xs ${colors.trackCard.addBtn} transition-colors`}>+ Add track</button>
          </div>
          <div className="space-y-3">
            {tracks.map((track) => (
              <div key={track._id} className={`border rounded p-3 space-y-2 ${track.path.trim() ? 'border-neutral-800' : 'border-neutral-800/50 opacity-60'}`}>
                <div className="flex gap-2">
                  <input value={track.title} onChange={e => updateTrack(track._id, 'title', e.target.value)}
                    className="flex-1 bg-neutral-900 border border-neutral-700 rounded px-2 py-1.5 text-sm text-neutral-100 focus:outline-none focus:border-green-600"
                    placeholder="Track title" />
                  <select value={track.stage} onChange={e => updateTrack(track._id, 'stage', e.target.value)}
                    className="bg-neutral-900 border border-neutral-700 rounded px-2 py-1.5 text-sm text-neutral-100 focus:outline-none focus:border-green-600">
                    <option value="writing">writing</option>
                    <option value="tracking">tracking</option>
                    <option value="mixing">mixing</option>
                    <option value="mastering">mastering</option>
                  </select>
                  {tracks.length > 1 && (
                    <button type="button" onClick={() => removeTrack(track._id)}
                      className={`text-xs px-1 ${colors.trackCard.removeBtn} transition-colors`}>✕</button>
                  )}
                </div>
                <TrackSearch
                  value={track.path}
                  onSelect={entry => selectTrack(track._id, entry)}
                  onClear={() => clearTrack(track._id)} />
                <div className="border-t border-neutral-800/50 pt-2">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`text-xs ${colors.docLinks.label}`}>Drive Docs</span>
                    <button type="button" onClick={() => addDocLink(track._id)}
                      className={`text-xs ${colors.docLinks.addBtn} transition-colors`}>+ link</button>
                  </div>
                  {track.docLinks.map((link, i) => (
                    <div key={i} className="flex gap-1.5 items-center mt-1">
                      <select value={link.type} onChange={e => updateDocLink(track._id, i, 'type', e.target.value)}
                        className={`bg-neutral-900 border border-neutral-700 rounded px-1.5 py-1 text-xs ${colors.docLinks.typeSelect} focus:outline-none focus:border-green-600`}>
                        <option value="lyrics">lyrics</option>
                        <option value="chart">chart</option>
                        <option value="sheet-music">sheet music</option>
                        <option value="other">other</option>
                      </select>
                      <input value={link.title} onChange={e => updateDocLink(track._id, i, 'title', e.target.value)}
                        placeholder="Label"
                        className={`w-24 bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-xs ${colors.docLinks.input} focus:outline-none focus:border-green-600`} />
                      <input value={link.url} onChange={e => updateDocLink(track._id, i, 'url', e.target.value)}
                        placeholder="https://docs.google.com/…"
                        className={`flex-1 bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-xs ${colors.docLinks.input} focus:outline-none focus:border-green-600 font-mono`} />
                      <button type="button" onClick={() => removeDocLink(track._id, i)}
                        className={`text-xs ${colors.docLinks.removeBtn} transition-colors`}>✕</button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          {validTracks.length > 0 && (
            <p className={`${colors.page.count} text-xs mt-2`}>{validTracks.length} track{validTracks.length !== 1 ? 's' : ''} will be included</p>
          )}
        </div>

      </form>
    </div>
  );
}
