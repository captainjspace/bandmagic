'use client';

import { useEffect, useRef, useState } from 'react';
import type { Release, Note } from '@/types';

const STAGE_COLORS: Record<string, string> = {
  writing: 'text-blue-400 border-blue-800 bg-blue-950/30',
  tracking: 'text-yellow-400 border-yellow-800 bg-yellow-950/30',
  mixing: 'text-orange-400 border-orange-800 bg-orange-950/30',
  mastering: 'text-green-400 border-green-800 bg-green-950/30',
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
          className="w-8 h-8 flex items-center justify-center rounded-full bg-green-500 hover:bg-green-400 text-black text-xs font-bold shrink-0 transition-colors">
          {playing ? '❚❚' : '▶'}
        </button>
        <div className="flex-1 h-1.5 bg-neutral-800 rounded-full cursor-pointer" onClick={seek}>
          <div className="h-full bg-green-500 rounded-full transition-all"
            style={{ width: duration ? `${(progress / duration) * 100}%` : '0%' }} />
        </div>
        <span className="text-xs text-neutral-500 tabular-nums shrink-0">
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
          <span className="text-green-500 text-xs">{note.author.split('@')[0]}</span>
          <span className="text-neutral-600 text-xs ml-2">{new Date(note.createdAt).toLocaleString()}</span>
          <p className="text-neutral-300 mt-0.5 leading-relaxed">{note.text}</p>
        </div>
      ))}
      <form onSubmit={submit} className="flex gap-2 pt-1">
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Add a note..."
          className="flex-1 bg-neutral-900 border border-neutral-700 rounded px-3 py-1.5 text-sm text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-green-600"
        />
        <button type="submit" disabled={loading || !text.trim()}
          className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40 text-neutral-300 text-sm rounded transition-colors">
          Post
        </button>
      </form>
    </div>
  );
}

export default function ReleasePage({ params }: { params: Promise<{ id: string }> }) {
  const [release, setRelease] = useState<Release | null>(null);
  const [activeTrack, setActiveTrack] = useState<string | null>(null);
  const [releaseId, setReleaseId] = useState<string>('');

  useEffect(() => {
    params.then(({ id }) => {
      setReleaseId(id);
      fetch(`/api/releases`)
        .then(r => r.json())
        .then((releases: Release[]) => {
          const found = releases.find(r => r.id === id);
          if (found) {
            setRelease(found);
            if (found.tracks.length > 0) setActiveTrack(found.tracks[0].path);
          }
        });
    });
  }, [params]);

  if (!release) {
    return <p className="text-neutral-500 text-sm">Loading...</p>;
  }

  const validTracks = release.tracks.filter(t => t.path?.trim());
  const active = validTracks.find(t => t.path === activeTrack);

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <a href="/" className="text-neutral-500 text-xs hover:text-neutral-300 transition-colors">← Releases</a>
          <a href={`/admin/${releaseId}`} className="text-neutral-500 text-xs hover:text-neutral-300 transition-colors">Edit</a>
        </div>
        <h1 className="text-2xl font-bold text-neutral-100 mt-2">{release.title}</h1>
        {release.description && <p className="text-neutral-500 text-sm mt-1">{release.description}</p>}
        <p className="text-neutral-600 text-xs mt-2">{new Date(release.createdAt).toLocaleDateString()}</p>
      </div>

      <div className="grid grid-cols-[280px_1fr] gap-6">
        {/* Tracklist */}
        <div className="space-y-1">
          <p className="text-neutral-600 text-xs uppercase tracking-wider mb-3">Tracks</p>
          {validTracks.map((track, i) => (
            <button key={track.path} onClick={() => setActiveTrack(track.path)}
              className={`w-full text-left px-3 py-2.5 rounded transition-colors flex items-start gap-3 ${
                activeTrack === track.path
                  ? 'bg-neutral-800 text-neutral-100'
                  : 'text-neutral-400 hover:bg-neutral-900 hover:text-neutral-200'
              }`}>
              <span className="text-neutral-600 text-xs tabular-nums w-4 shrink-0 mt-0.5">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <div className="text-sm truncate">{track.title}</div>
                {track.stage && (
                  <span className={`text-xs border px-1 py-0 rounded mt-0.5 inline-block ${STAGE_COLORS[track.stage] ?? ''}`}>
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
                <h2 className="text-lg font-semibold text-neutral-100">{active.title}</h2>
                {active.stage && (
                  <span className={`text-xs border px-1.5 py-0.5 rounded ${STAGE_COLORS[active.stage] ?? ''}`}>
                    {active.stage}
                  </span>
                )}
              </div>
              <TrackPlayer key={active.path} path={active.path} title={active.title} />
              <div className="border-t border-neutral-800 pt-4">
                <p className="text-neutral-600 text-xs uppercase tracking-wider mb-3">Notes</p>
                <NoteThread releaseId={releaseId} trackPath={active.path} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
