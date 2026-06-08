'use client';

import { useState } from 'react';

interface TrackEntry {
  path: string;
  title: string;
  stage: string;
}

export default function AdminPage() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tracks, setTracks] = useState<TrackEntry[]>([{ path: '', title: '', stage: 'mixing' }]);
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');

  const addTrack = () => setTracks(prev => [...prev, { path: '', title: '', stage: 'mixing' }]);
  const removeTrack = (i: number) => setTracks(prev => prev.filter((_, idx) => idx !== i));
  const updateTrack = (i: number, field: keyof TrackEntry, value: string) =>
    setTracks(prev => prev.map((t, idx) => idx === i ? { ...t, [field]: value } : t));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending');
    try {
      const res = await fetch('/api/releases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, tracks }),
      });
      if (!res.ok) throw new Error('Failed');
      setStatus('done');
      setTitle(''); setDescription(''); setTracks([{ path: '', title: '', stage: 'mixing' }]);
    } catch {
      setStatus('error');
    }
  };

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-neutral-100">New Release</h1>
        <p className="text-neutral-500 text-sm mt-1">Curate tracks and notify the band.</p>
      </div>

      {status === 'done' && (
        <div className="mb-6 p-3 border border-green-800 bg-green-950/30 rounded text-green-400 text-sm">
          Release created and band notified.
        </div>
      )}
      {status === 'error' && (
        <div className="mb-6 p-3 border border-red-800 bg-red-950/30 rounded text-red-400 text-sm">
          Something went wrong. Check the console.
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
            <label className="text-xs text-neutral-500 uppercase tracking-wider">Tracks</label>
            <button type="button" onClick={addTrack}
              className="text-xs text-green-500 hover:text-green-400 transition-colors">+ Add track</button>
          </div>
          <div className="space-y-3">
            {tracks.map((track, i) => (
              <div key={i} className="border border-neutral-800 rounded p-3 space-y-2">
                <div className="flex gap-2">
                  <input value={track.title} onChange={e => updateTrack(i, 'title', e.target.value)}
                    className="flex-1 bg-neutral-900 border border-neutral-700 rounded px-2 py-1.5 text-sm text-neutral-100 focus:outline-none focus:border-green-600"
                    placeholder="Track title" />
                  <select value={track.stage} onChange={e => updateTrack(i, 'stage', e.target.value)}
                    className="bg-neutral-900 border border-neutral-700 rounded px-2 py-1.5 text-sm text-neutral-100 focus:outline-none focus:border-green-600">
                    <option value="writing">writing</option>
                    <option value="tracking">tracking</option>
                    <option value="mixing">mixing</option>
                    <option value="mastering">mastering</option>
                  </select>
                  {tracks.length > 1 && (
                    <button type="button" onClick={() => removeTrack(i)}
                      className="text-neutral-600 hover:text-red-400 text-xs px-1 transition-colors">✕</button>
                  )}
                </div>
                <input value={track.path} onChange={e => updateTrack(i, 'path', e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded px-2 py-1.5 text-xs text-neutral-400 font-mono focus:outline-none focus:border-green-600"
                  placeholder="2026/mixing/song-name/mix-003.mp3" />
              </div>
            ))}
          </div>
        </div>

        <button type="submit" disabled={status === 'sending' || !title.trim()}
          className="w-full py-2.5 bg-green-600 hover:bg-green-500 disabled:opacity-40 text-black font-semibold text-sm rounded transition-colors">
          {status === 'sending' ? 'Releasing...' : 'Release + Notify Band'}
        </button>
      </form>
    </div>
  );
}
