'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import type { TrackGroup, CatalogEntry, Asset } from '@/types';
import { TrackSearch } from '@/components/TrackSearch';
import { AssetPicker, type AssetsLoadKind } from '@/components/AssetPicker';

/** element colors */
const colors = {
  page: {
    title:        'text-neutral-100',
    trackGroupId: 'text-neutral-500',
    navLink:      'text-neutral-500 hover:text-neutral-300',
    fieldLabel:   'text-neutral-500',
    hint:         'text-neutral-600',
    count:        'text-neutral-600',
  },
  status: {
    success:     'text-green-400',
    successLink: 'text-green-400 hover:text-green-300 underline',
    error:       'text-red-400',
  },
  trackHeader: {
    addBtn:  'border border-green-700 hover:border-green-500 text-green-400 hover:text-green-300 rounded px-3 py-1.5 transition-colors',
    saveBtn: 'border border-neutral-700 hover:border-neutral-500 text-neutral-200 rounded px-3 py-1.5 disabled:opacity-40 transition-colors',
  },
  trackCard: {
    base:      'border border-neutral-800',
    empty:     'border border-neutral-800/50 opacity-60',
    justSaved: 'border border-green-600',
    saveBtn:   'text-green-500 hover:text-green-400 disabled:opacity-30 disabled:hover:text-green-500 transition-colors',
    removeBtn: 'text-neutral-600 hover:text-red-400 transition-colors',
  },
  assets: {
    label:       'text-neutral-600',
    errorBanner: 'text-amber-400',
    retryBtn:    'text-amber-400 hover:text-amber-300 underline',
  },
  sweep: {
    btn:      'text-neutral-500 hover:text-green-400',
    btnBusy:  'text-neutral-400',
    banner:   'text-neutral-300',
    counts:   'text-green-400',
    errors:   'text-amber-400',
  },
};

type SweepResponse = {
  proposed: number;
  created: number;
  attached: number;
  errors: { trackPath: string; trackTitle: string; reason: string }[];
};

interface TrackEntry {
  _id: string;
  path: string;
  title: string;
  stage: string;
  assetIds: string[];
}

const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

function newTrack(): TrackEntry {
  return { _id: uid(), path: '', title: '', stage: 'mixing', assetIds: [] };
}

function fromTrackGroup(trackGroup: TrackGroup): { title: string; description: string; tracks: TrackEntry[] } {
  return {
    title: trackGroup.title,
    description: trackGroup.description ?? '',
    tracks: trackGroup.tracks.length > 0
      ? trackGroup.tracks.map(t => ({ _id: uid(), path: t.path, title: t.title, stage: t.stage ?? 'mixing', assetIds: t.assetIds ?? [] }))
      : [newTrack()],
  };
}

export default function EditTrackGroupPage({ params }: { params: Promise<{ id: string }> }) {
  const [trackGroupId, setTrackGroupId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tracks, setTracks] = useState<TrackEntry[]>([newTrack()]);
  const [savedTracks, setSavedTracks] = useState<TrackEntry[]>([]);
  const [savingRowId, setSavingRowId] = useState<string | null>(null);
  const [justSavedId, setJustSavedId] = useState<string | null>(null);
  const [status, setStatus] = useState<'loading' | 'idle' | 'sending' | 'done' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  const [assets, setAssets] = useState<Asset[]>([]);
  const [assetsLoad, setAssetsLoad] = useState<AssetsLoadKind>('loading');
  const [assetsError, setAssetsError] = useState('');

  const fetchAssets = useCallback(async () => {
    try {
      const res = await fetch('/api/assets');
      if (!res.ok) throw new Error(`Failed to load assets: ${res.status}`);
      setAssets(await res.json());
      setAssetsLoad('loaded');
    } catch (e) {
      setAssetsError(e instanceof Error ? e.message : 'Failed to load assets');
      setAssetsLoad('error');
    }
  }, []);

  const retryAssets = useCallback(() => {
    setAssetsLoad('loading');
    setAssetsError('');
    fetchAssets();
  }, [fetchAssets]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot fetch on mount; setState fires after await, not synchronously
  useEffect(() => { fetchAssets(); }, [fetchAssets]);

  const handleAssetCreated = useCallback((asset: Asset) => {
    setAssets(prev => [asset, ...prev]);
  }, []);

  const [sweepResult, setSweepResult] = useState<SweepResponse | null>(null);
  const [sweeping, setSweeping] = useState(false);

  const isBusy = savingRowId !== null || status === 'sending' || sweeping;

  useEffect(() => {
    params.then(async ({ id }) => {
      setTrackGroupId(id);
      const res = await fetch(`/api/track-groups/${id}`);
      if (!res.ok) { setStatus('error'); setErrorMsg('TrackGroup not found.'); return; }
      const trackGroup: TrackGroup = await res.json();
      const { title, description, tracks } = fromTrackGroup(trackGroup);
      setTitle(title);
      setDescription(description);
      setTracks(tracks);
      setSavedTracks(tracks);
      setStatus('idle');
    });
  }, [params]);

  const addTrack = () => setTracks(prev => [newTrack(), ...prev]);

  const stripIdAndTrim = (t: TrackEntry) => ({
    path: t.path.trim(),
    title: t.title.trim() || t.path.split('/').pop() || t.path,
    stage: t.stage,
    assetIds: t.assetIds,
  });

  const flashSaved = (id: string) => {
    setJustSavedId(id);
    setTimeout(() => setJustSavedId(curr => (curr === id ? null : curr)), 1000);
  };

  const saveRow = async (id: string) => {
    const row = tracks.find(t => t._id === id);
    if (!row || !row.path.trim() || isBusy) return;
    setSavingRowId(id);
    setErrorMsg('');
    try {
      const inBaseline = savedTracks.some(t => t._id === id);
      const nextBaseline = inBaseline
        ? savedTracks.map(t => t._id === id ? row : t)
        : [...savedTracks, row];
      const payload = { tracks: nextBaseline.filter(t => t.path.trim()).map(stripIdAndTrim) };
      const res = await fetch(`/api/track-groups/${trackGroupId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text() || 'Failed');
      setSavedTracks(nextBaseline);
      setTracks(prev => prev.map(t => t._id === id ? { ...row } : t));
      flashSaved(id);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to save track.');
      setStatus('error');
    } finally {
      setSavingRowId(null);
    }
  };

  const deleteRow = async (id: string) => {
    const row = tracks.find(t => t._id === id);
    const inBaseline = savedTracks.some(t => t._id === id);
    if (!row) return;
    if (!inBaseline) {
      setTracks(prev => prev.filter(t => t._id !== id));
      return;
    }
    if (isBusy) return;
    if (!confirm(`Delete "${row.title || row.path}"?`)) return;
    setSavingRowId(id);
    setErrorMsg('');
    try {
      const nextBaseline = savedTracks.filter(t => t._id !== id);
      const payload = { tracks: nextBaseline.filter(t => t.path.trim()).map(stripIdAndTrim) };
      const res = await fetch(`/api/track-groups/${trackGroupId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text() || 'Failed');
      setSavedTracks(nextBaseline);
      setTracks(prev => prev.filter(t => t._id !== id));
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to delete track.');
      setStatus('error');
    } finally {
      setSavingRowId(null);
    }
  };
  const updateTrack = useCallback((id: string, field: keyof Omit<TrackEntry, '_id' | 'assetIds'>, value: string) =>
    setTracks(prev => prev.map(t => t._id === id ? { ...t, [field]: value } : t)), []);
  const selectTrack = useCallback((id: string, entry: CatalogEntry) =>
    setTracks(prev => prev.map(t => t._id === id
      ? { ...t, path: entry.path, title: entry.title, stage: entry.stage }
      : t)), []);
  const clearTrack = useCallback((id: string) =>
    setTracks(prev => prev.map(t => t._id === id ? { ...t, path: '', title: '' } : t)), []);

  const setAssetIds = useCallback((id: string, assetIds: string[]) =>
    setTracks(prev => prev.map(t => t._id === id ? { ...t, assetIds } : t)), []);

  const runSweep = async () => {
    if (!trackGroupId || isBusy) return;
    setSweeping(true);
    setSweepResult(null);
    try {
      const res = await fetch('/api/admin/sweep-drive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackGroupId }),
      });
      if (!res.ok) throw new Error(await res.text() || 'Sweep failed');
      const result: SweepResponse = await res.json();
      setSweepResult(result);
      await fetchAssets();
      const rel = await fetch(`/api/track-groups/${trackGroupId}`);
      if (rel.ok) {
        const trackGroup: TrackGroup = await rel.json();
        const refreshed = fromTrackGroup(trackGroup);
        setTracks(refreshed.tracks);
        setSavedTracks(refreshed.tracks);
      }
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Sweep failed');
      setStatus('error');
    } finally {
      setSweeping(false);
    }
  };

  const validTracks = tracks.filter(t => t.path.trim());

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || validTracks.length === 0 || isBusy) return;
    setStatus('sending');
    setErrorMsg('');

    const payload = {
      title: title.trim(),
      description: description.trim(),
      tracks: validTracks.map(stripIdAndTrim),
    };

    try {
      const res = await fetch(`/api/track-groups/${trackGroupId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text() || 'Failed');
      setSavedTracks(validTracks);
      setStatus('done');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong.');
      setStatus('error');
    }
  };

  if (status === 'loading') {
    return <p className={`${colors.page.trackGroupId} text-sm`}>Loading...</p>;
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className={`text-2xl font-bold ${colors.page.title}`}>Edit TrackGroup</h1>
          <p className={`${colors.page.trackGroupId} font-mono text-xs mt-1`}>{trackGroupId}</p>
        </div>
        <div className="flex items-center gap-3 mt-1">
          <button type="button" onClick={runSweep} disabled={isBusy}
            className={`text-xs ${sweeping ? colors.sweep.btnBusy : colors.sweep.btn} disabled:opacity-60 transition-colors`}>
            {sweeping ? 'Sweeping…' : '↻ Sweep Drive'}
          </button>
          <Link href="/admin/assets" className={`${colors.page.navLink} text-xs transition-colors`}>Assets</Link>
          <Link href={`/track-group/${trackGroupId}`} className={`${colors.page.navLink} text-xs transition-colors`}>← Back to track group</Link>
        </div>
      </div>

      {status === 'done' && (
        <div className="mb-6 p-3 border border-green-800 bg-green-950/30 rounded text-sm">
          <span className={colors.status.success}>Saved. </span>
          <Link href={`/track-group/${trackGroupId}`} className={colors.status.successLink}>View track group →</Link>
        </div>
      )}
      {status === 'error' && (
        <div className="mb-6 p-3 border border-red-800 bg-red-950/30 rounded text-sm">
          <span className={colors.status.error}>{errorMsg}</span>
        </div>
      )}
      {assetsLoad === 'error' && (
        <div className="mb-6 p-3 border border-amber-800 bg-amber-950/30 rounded text-sm flex items-center justify-between">
          <span className={colors.assets.errorBanner}>Asset list unavailable — {assetsError}</span>
          <button type="button" onClick={retryAssets}
            className={`${colors.assets.retryBtn} text-xs transition-colors`}>Retry</button>
        </div>
      )}
      {sweepResult && (
        <div className="mb-6 p-3 border border-neutral-800 bg-neutral-900/50 rounded text-sm space-y-1">
          <p className={colors.sweep.banner}>
            Drive sweep — <span className={colors.sweep.counts}>{sweepResult.proposed} proposed · {sweepResult.created} created · {sweepResult.attached} attached</span>
          </p>
          {sweepResult.errors.length > 0 && (
            <ul className={`text-xs ${colors.sweep.errors} list-disc list-inside`}>
              {sweepResult.errors.map((e, i) => (
                <li key={i}>{e.trackTitle || '(trackGroup)'}: {e.reason}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <form onSubmit={submit} className="space-y-6">
        <div className="space-y-4">
          <div>
            <label className={`block text-xs ${colors.page.fieldLabel} uppercase tracking-wider mb-1.5`}>Title</label>
            <input value={title} onChange={e => setTitle(e.target.value)} required
              className="w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:border-green-600" />
          </div>
          <div>
            <label className={`block text-xs ${colors.page.fieldLabel} uppercase tracking-wider mb-1.5`}>Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:border-green-600 resize-none h-20" />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3 gap-3">
            <label className={`text-xs ${colors.page.fieldLabel} uppercase tracking-wider`}>
              Tracks
              {tracks.some(t => !t.path.trim()) && (
                <span className={`ml-2 ${colors.page.hint} normal-case`}>(empty rows will be skipped)</span>
              )}
            </label>
            <div className="flex items-center gap-2">
              <button type="button" onClick={addTrack} disabled={isBusy}
                className={`text-xs ${colors.trackHeader.addBtn} disabled:opacity-40`}>+ Add Track</button>
              <button type="submit" disabled={isBusy || !title.trim() || validTracks.length === 0}
                className={`text-xs ${colors.trackHeader.saveBtn}`}>
                {status === 'sending' ? 'Saving…' : 'Save track group'}
              </button>
            </div>
          </div>
          <div className="space-y-3">
            {tracks.map((track) => {
              const cardBorder = justSavedId === track._id
                ? colors.trackCard.justSaved
                : track.path.trim() ? colors.trackCard.base : colors.trackCard.empty;
              const rowBusy = savingRowId === track._id;
              return (
                <div key={track._id} className={`${cardBorder} rounded p-3 space-y-2 transition-colors duration-500`}>
                  <div className="flex gap-2 items-center">
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
                    <button type="button" onClick={() => saveRow(track._id)}
                      disabled={!track.path.trim() || isBusy}
                      aria-label="Save this track"
                      title="Save this track only"
                      className={`text-base px-1 ${colors.trackCard.saveBtn}`}>{rowBusy ? '…' : '✓'}</button>
                    <button type="button" onClick={() => deleteRow(track._id)}
                      disabled={isBusy}
                      aria-label="Delete this track"
                      title="Delete this track"
                      className={`text-base px-1 ${colors.trackCard.removeBtn} disabled:opacity-30`}>✕</button>
                  </div>
                  <TrackSearch
                    value={track.path}
                    onSelect={entry => selectTrack(track._id, entry)}
                    onClear={() => clearTrack(track._id)} />
                  <div className="border-t border-neutral-800/50 pt-2">
                    <p className={`text-xs ${colors.assets.label} mb-1.5`}>Assets</p>
                    <AssetPicker
                      value={track.assetIds}
                      onChange={ids => setAssetIds(track._id, ids)}
                      assets={assets}
                      loadState={assetsLoad}
                      onAssetCreated={handleAssetCreated}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          {validTracks.length > 0 && (
            <p className={`${colors.page.count} text-xs mt-2`}>{validTracks.length} track{validTracks.length !== 1 ? 's' : ''} will be saved</p>
          )}
        </div>

        <button type="submit" disabled={isBusy || !title.trim() || validTracks.length === 0}
          className="w-full py-2.5 bg-green-600 hover:bg-green-500 disabled:opacity-40 text-black font-semibold text-sm rounded transition-colors">
          {status === 'sending' ? 'Saving...' : 'Save Changes'}
        </button>
      </form>
    </div>
  );
}
