'use client';

import { useState, useCallback } from 'react';
import { TrackSearch } from '@/components/TrackSearch';
import type { CatalogEntry } from '@/types';

interface TrackEntry {
  _id: string;
  path: string;
  title: string;
  stage: string;
}

const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

function newTrack(): TrackEntry {
  return { _id: uid(), path: '', title: '', stage: 'mixing' };
}

export default function AdminPage() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tracks, setTracks] = useState<TrackEntry[]>([newTrack()]);
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const addTrack = () => setTracks(prev => [...prev, newTrack()]);
  const removeTrack = (id: string) => setTracks(prev => prev.filter(t => t._id !== id));
  const updateTrack = useCallback((id: string, field: keyof Omit<TrackEntry, '_id'>, value: string) =>
    setTracks(prev => prev.map(t => t._id === id ? { ...t, [field]: value } : t)), []);
  const selectTrack = useCallback((id: string, entry: CatalogEntry) =>
    setTracks(prev => prev.map(t => t._id === id
      ? { ...t, path: entry.path, title: entry.title, stage: entry.stage }
      : t)), []);
  const clearTrack = useCallback((id: string) =>
    setTracks(prev => prev.map(t => t._id === id ? { ...t, path: '', title: '' } : t)), []);

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
      tracks: validTracks.map(({ _id: _, ...t }) => ({ ...t, path: t.path.trim(), title: t.title.trim() || t.path.split('/').pop() || t.path })),
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
          <h1 className="text-2xl font-bold text-neutral-100">New Release</h1>
          <p className="text-neutral-500 text-sm mt-1">Curate tracks and notify the band.</p>
        </div>
        <div className="flex items-center gap-3 mt-1">
          <button type="button" onClick={sync}
            className="text-xs text-neutral-600 hover:text-neutral-400 transition-colors">↻ Sync catalog</button>
          <a href="/" className="text-neutral-500 text-xs hover:text-neutral-300 transition-colors">← Releases</a>
        </div>
      </div>

      {status === 'done' && (
        <div className="mb-6 p-3 border border-green-800 bg-green-950/30 rounded text-green-400 text-sm">
          Release created and band notified.
        </div>
      )}
      {status === 'error' && (
        <div className="mb-6 p-3 border border-red-800 bg-red-950/30 rounded text-red-400 text-sm">
          {errorMsg || 'Something went wrong. Check the console.'}
        </div>
      )}

      <form onSubmit={submit} className="space-y-6">
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-neutral-500 uppercase tracking-wider mb-1.5">Title</label>
            <input value={title} onChange={e => setTitle(e.target.value)} required
              className="w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:border-green-600"
              placeholder="June 2026 Rough Cuts" />
          </div>
          <div>
            <label className="block text-xs text-neutral-500 uppercase tracking-wider mb-1.5">Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:border-green-600 resize-none h-20"
              placeholder="What's in this release?" />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-xs text-neutral-500 uppercase tracking-wider">
              Tracks
              {tracks.some(t => !t.path.trim()) && (
                <span className="ml-2 text-neutral-600 normal-case">(empty rows will be skipped)</span>
              )}
            </label>
            <button type="button" onClick={addTrack}
              className="text-xs text-green-500 hover:text-green-400 transition-colors">+ Add track</button>
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
                      className="text-neutral-600 hover:text-red-400 text-xs px-1 transition-colors">✕</button>
                  )}
                </div>
                <TrackSearch
                  value={track.path}
                  onSelect={entry => selectTrack(track._id, entry)}
                  onClear={() => clearTrack(track._id)} />
              </div>
            ))}
          </div>
          {validTracks.length > 0 && (
            <p className="text-neutral-600 text-xs mt-2">{validTracks.length} track{validTracks.length !== 1 ? 's' : ''} will be included</p>
          )}
        </div>

        <button type="submit" disabled={status === 'sending' || !title.trim() || validTracks.length === 0}
          className="w-full py-2.5 bg-green-600 hover:bg-green-500 disabled:opacity-40 text-black font-semibold text-sm rounded transition-colors">
          {status === 'sending' ? 'Releasing...' : 'Release + Notify Band'}
        </button>
      </form>
    </div>
  );
}
