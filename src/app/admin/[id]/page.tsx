'use client';

import { useEffect, useState, useCallback } from 'react';
import type { Release } from '@/types';

interface TrackEntry {
  _id: string;
  path: string;
  title: string;
  stage: string;
}

function newTrack(): TrackEntry {
  return { _id: crypto.randomUUID(), path: '', title: '', stage: 'mixing' };
}

function fromRelease(release: Release): { title: string; description: string; tracks: TrackEntry[] } {
  return {
    title: release.title,
    description: release.description ?? '',
    tracks: release.tracks.length > 0
      ? release.tracks.map(t => ({ _id: crypto.randomUUID(), path: t.path, title: t.title, stage: t.stage ?? 'mixing' }))
      : [newTrack()],
  };
}

export default function EditReleasePage({ params }: { params: Promise<{ id: string }> }) {
  const [releaseId, setReleaseId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tracks, setTracks] = useState<TrackEntry[]>([newTrack()]);
  const [status, setStatus] = useState<'loading' | 'idle' | 'sending' | 'done' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    params.then(async ({ id }) => {
      setReleaseId(id);
      const res = await fetch(`/api/releases/${id}`);
      if (!res.ok) { setStatus('error'); setErrorMsg('Release not found.'); return; }
      const release: Release = await res.json();
      const { title, description, tracks } = fromRelease(release);
      setTitle(title);
      setDescription(description);
      setTracks(tracks);
      setStatus('idle');
    });
  }, [params]);

  const addTrack = () => setTracks(prev => [...prev, newTrack()]);
  const removeTrack = (id: string) => setTracks(prev => prev.filter(t => t._id !== id));
  const updateTrack = useCallback((id: string, field: keyof Omit<TrackEntry, '_id'>, value: string) =>
    setTracks(prev => prev.map(t => t._id === id ? { ...t, [field]: value } : t)), []);

  const validTracks = tracks.filter(t => t.path.trim());

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || validTracks.length === 0) return;
    setStatus('sending');
    setErrorMsg('');

    const payload = {
      title: title.trim(),
      description: description.trim(),
      tracks: validTracks.map(({ _id: _, ...t }) => ({ ...t, path: t.path.trim(), title: t.title.trim() || t.path.split('/').pop() || t.path })),
    };

    try {
      const res = await fetch(`/api/releases/${releaseId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text() || 'Failed');
      setStatus('done');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong.');
      setStatus('error');
    }
  };

  if (status === 'loading') {
    return <p className="text-neutral-500 text-sm">Loading...</p>;
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-100">Edit Release</h1>
          <p className="text-neutral-500 text-sm mt-1 font-mono text-xs">{releaseId}</p>
        </div>
        <a href={`/release/${releaseId}`} className="text-neutral-500 text-xs hover:text-neutral-300 transition-colors mt-1">← Back to release</a>
      </div>

      {status === 'done' && (
        <div className="mb-6 p-3 border border-green-800 bg-green-950/30 rounded text-green-400 text-sm">
          Saved. <a href={`/release/${releaseId}`} className="underline hover:text-green-300">View release →</a>
        </div>
      )}
      {status === 'error' && (
        <div className="mb-6 p-3 border border-red-800 bg-red-950/30 rounded text-red-400 text-sm">
          {errorMsg}
        </div>
      )}

      <form onSubmit={submit} className="space-y-6">
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-neutral-500 uppercase tracking-wider mb-1.5">Title</label>
            <input value={title} onChange={e => setTitle(e.target.value)} required
              className="w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:border-green-600" />
          </div>
          <div>
            <label className="block text-xs text-neutral-500 uppercase tracking-wider mb-1.5">Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:border-green-600 resize-none h-20" />
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
                  <button type="button" onClick={() => removeTrack(track._id)}
                    className="text-neutral-600 hover:text-red-400 text-xs px-1 transition-colors">✕</button>
                </div>
                <input value={track.path} onChange={e => updateTrack(track._id, 'path', e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1.5 text-xs text-neutral-400 font-mono focus:outline-none focus:border-green-600"
                  placeholder="2026/mixing/song-name/mix-003.mp3" />
              </div>
            ))}
          </div>
          {validTracks.length > 0 && (
            <p className="text-neutral-600 text-xs mt-2">{validTracks.length} track{validTracks.length !== 1 ? 's' : ''} will be saved</p>
          )}
        </div>

        <button type="submit" disabled={status === 'sending' || !title.trim() || validTracks.length === 0}
          className="w-full py-2.5 bg-green-600 hover:bg-green-500 disabled:opacity-40 text-black font-semibold text-sm rounded transition-colors">
          {status === 'sending' ? 'Saving...' : 'Save Changes'}
        </button>
      </form>
    </div>
  );
}
