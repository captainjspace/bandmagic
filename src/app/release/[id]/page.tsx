'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { Release, Note, Asset } from '@/types';
import { stageClass, stageBgClass } from '@/lib/stage';
import { assetClass, driveDocKind } from '@/lib/asset';
import type { AssetsLoadKind } from '@/components/AssetPicker';

/** element colors */
const colors = {
  page: {
    title:        'text-neutral-100',
    description:  'text-neutral-500',
    date:         'text-neutral-600',
    navLink:      'text-neutral-500 hover:text-neutral-300',
    sectionLabel: 'text-neutral-600',
  },
  tracklist: {
    number: 'text-neutral-600',
    idle:   'text-neutral-400 hover:text-neutral-200',
    active: 'text-neutral-100',
  },
  trackPlayer: {
    playButton:   'bg-green-500 hover:bg-green-400 text-black',
    progressFill: 'bg-green-500',
    timestamp:    'text-neutral-500',
  },
  noteThread: {
    author:      'text-green-500',
    timestamp:   'text-neutral-600',
    body:        'text-neutral-300',
    inputText:   'text-neutral-100',
    placeholder: 'placeholder-neutral-600',
    focusBorder: 'focus:border-green-600',
    postBtn:     'text-neutral-300',
  },
  assets: {
    label:       'text-neutral-600',
    linkText:    'text-green-400 group-hover:text-green-300',
    kindBadge:   'text-neutral-600',
    loadingRow:  'text-neutral-500',
    errorRow:    'text-amber-400',
    retryBtn:    'text-amber-400 hover:text-amber-300 underline',
    missingRow:  'text-red-400',
  },
};

function TrackPlayer({ path, title }: { path: string; title: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  const toggle = () => {
    if (!audioRef.current) return;
    playing ? audioRef.current.pause() : audioRef.current.play();
    setPlaying(!playing);
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    audioRef.current.currentTime = ((e.clientX - rect.left) / rect.width) * duration;
  };

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

  return (
    <div className="space-y-2">
      <audio
        ref={audioRef}
        src={`/api/audio?path=${encodeURIComponent(path)}`}
        onTimeUpdate={() => setProgress(audioRef.current?.currentTime ?? 0)}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration ?? 0)}
        onEnded={() => setPlaying(false)}
      />
      <div className="flex items-center gap-3">
        <button onClick={toggle}
          className={`w-8 h-8 flex items-center justify-center rounded-full ${colors.trackPlayer.playButton} text-xs font-bold shrink-0 transition-colors`}>
          {playing ? '❚❚' : '▶'}
        </button>
        <div className="flex-1 h-1.5 bg-neutral-800 rounded-full cursor-pointer" onClick={seek}>
          <div className={`h-full ${colors.trackPlayer.progressFill} rounded-full transition-all`}
            style={{ width: duration ? `${(progress / duration) * 100}%` : '0%' }} />
        </div>
        <span className={`text-xs ${colors.trackPlayer.timestamp} tabular-nums shrink-0`}>
          {fmt(progress)} / {fmt(duration)}
        </span>
      </div>
    </div>
  );
}

function NoteThread({ releaseId, trackPath }: { releaseId: string; trackPath: string }) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`/api/releases/${releaseId}/notes?track=${encodeURIComponent(trackPath)}`)
      .then(r => r.json())
      .then(setNotes);
  }, [releaseId, trackPath]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    setLoading(true);
    const res = await fetch(`/api/releases/${releaseId}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: text.trim(), trackPath }),
    });
    const note = await res.json();
    setNotes(prev => [...prev, note]);
    setText('');
    setLoading(false);
  };

  return (
    <div className="mt-4 space-y-3">
      {notes.map(note => (
        <div key={note.id} className="text-sm">
          <span className={`${colors.noteThread.author} text-xs`}>{note.author.split('@')[0]}</span>
          <span className={`${colors.noteThread.timestamp} text-xs ml-2`}>{new Date(note.createdAt).toLocaleString()}</span>
          <p className={`${colors.noteThread.body} mt-0.5 leading-relaxed`}>{note.text}</p>
        </div>
      ))}
      <form onSubmit={submit} className="flex gap-2 pt-1">
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Add a note..."
          className={`flex-1 bg-neutral-900 border border-neutral-700 rounded px-3 py-1.5 text-sm ${colors.noteThread.inputText} ${colors.noteThread.placeholder} focus:outline-none ${colors.noteThread.focusBorder}`}
        />
        <button type="submit" disabled={loading || !text.trim()}
          className={`px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40 ${colors.noteThread.postBtn} text-sm rounded transition-colors`}>
          Post
        </button>
      </form>
    </div>
  );
}

export default function ReleasePage({ params }: { params: Promise<{ id: string }> }) {
  const [release, setRelease] = useState<Release | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [assetsLoad, setAssetsLoad] = useState<AssetsLoadKind>('loading');
  const [activeTrack, setActiveTrack] = useState<string | null>(null);
  const [releaseId, setReleaseId] = useState<string>('');

  const fetchAssets = useCallback(async () => {
    try {
      const res = await fetch('/api/assets');
      if (!res.ok) throw new Error(`Failed to load: ${res.status}`);
      setAssets(await res.json());
      setAssetsLoad('loaded');
    } catch {
      setAssetsLoad('error');
    }
  }, []);

  const retryAssets = useCallback(() => {
    setAssetsLoad('loading');
    fetchAssets();
  }, [fetchAssets]);

  useEffect(() => {
    params.then(async ({ id }) => {
      setReleaseId(id);
      const rRel = await fetch('/api/releases');
      const releases: Release[] = await rRel.json();
      const found = releases.find(r => r.id === id);
      if (found) {
        setRelease(found);
        if (found.tracks.length > 0) setActiveTrack(found.tracks[0].path);
      }
    });
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot fetch on mount; setState fires after await
    fetchAssets();
  }, [params, fetchAssets]);

  if (!release) {
    return <p className={`${colors.page.description} text-sm`}>Loading...</p>;
  }

  const validTracks = release.tracks.filter(t => t.path?.trim());
  const active = validTracks.find(t => t.path === activeTrack);
  const assetsById = new Map(assets.map(a => [a.id, a]));

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <Link href="/" className={`${colors.page.navLink} text-xs transition-colors`}>← Releases</Link>
          <Link href={`/admin/${releaseId}`} className={`${colors.page.navLink} text-xs transition-colors`}>Edit</Link>
        </div>
        <h1 className={`text-2xl font-bold ${colors.page.title} mt-2`}>{release.title}</h1>
        {release.description && <p className={`${colors.page.description} text-sm mt-1`}>{release.description}</p>}
        <p className={`${colors.page.date} text-xs mt-2`}>{new Date(release.createdAt).toLocaleDateString()}</p>
      </div>

      <div className="grid grid-cols-[280px_1fr] gap-6">
        {/* Tracklist */}
        <div className="space-y-1">
          <p className={`${colors.page.sectionLabel} text-xs uppercase tracking-wider mb-3`}>Tracks</p>
          {validTracks.map((track, i) => (
            <button key={track.path} onClick={() => setActiveTrack(track.path)}
              className={`w-full text-left px-3 py-2.5 rounded transition-colors flex items-start gap-3 ${
                activeTrack === track.path
                  ? `bg-neutral-800 ${colors.tracklist.active}`
                  : `${colors.tracklist.idle} hover:bg-neutral-900`
              }`}>
              <span className={`${colors.tracklist.number} text-xs tabular-nums w-4 shrink-0 mt-0.5`}>{i + 1}</span>
              <div className="min-w-0 flex-1">
                <div className="text-sm truncate">{track.title}</div>
                {track.stage && (
                  <span className={`text-xs border px-1 py-0 rounded mt-0.5 inline-block ${stageClass(track.stage)} ${stageBgClass(track.stage)}`}>
                    {track.stage}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Player + Notes */}
        <div>
          {active && (
            <div className="border border-neutral-800 rounded-lg p-5 space-y-5">
              <div>
                <h2 className={`text-lg font-semibold ${colors.page.title}`}>{active.title}</h2>
                {active.stage && (
                  <span className={`text-xs border px-1.5 py-0.5 rounded ${stageClass(active.stage)} ${stageBgClass(active.stage)}`}>
                    {active.stage}
                  </span>
                )}
              </div>
              <TrackPlayer key={active.path} path={active.path} title={active.title} />
              <div className="border-t border-neutral-800 pt-4">
                <p className={`${colors.page.sectionLabel} text-xs uppercase tracking-wider mb-3`}>Notes</p>
                <NoteThread releaseId={releaseId} trackPath={active.path} />
              </div>

              {active.assetIds && active.assetIds.length > 0 && (
                <div className="border-t border-neutral-800 pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className={`${colors.assets.label} text-xs uppercase tracking-wider`}>Documents & links</p>
                    {assetsLoad === 'error' && (
                      <button type="button" onClick={retryAssets}
                        className={`text-xs ${colors.assets.retryBtn} transition-colors`}>Retry</button>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    {active.assetIds.map(id => {
                      if (assetsLoad === 'loading') {
                        return (
                          <p key={id} className={`text-xs ${colors.assets.loadingRow}`}>loading…</p>
                        );
                      }
                      if (assetsLoad === 'error') {
                        return (
                          <p key={id} className={`text-xs ${colors.assets.errorRow}`}>load failed</p>
                        );
                      }
                      const asset = assetsById.get(id);
                      if (!asset) {
                        return (
                          <p key={id} className={`text-xs ${colors.assets.missingRow} font-mono`}>
                            missing: {id}
                          </p>
                        );
                      }
                      const kind = driveDocKind(asset.url);
                      return (
                        <a key={id} href={asset.url} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-2 group">
                          <span className={`text-xs border px-1.5 py-0.5 rounded shrink-0 uppercase tracking-wider ${assetClass(asset.subtype)}`}>
                            {asset.subtype}
                          </span>
                          <span className={`text-sm ${colors.assets.linkText} transition-colors truncate flex-1`}>
                            {asset.title}
                          </span>
                          <span className={`text-xs ${colors.assets.kindBadge} shrink-0`}>
                            {asset.type}{kind ? `·${kind}` : ''}
                          </span>
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
