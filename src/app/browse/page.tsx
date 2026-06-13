'use client';

import { useEffect, useState } from 'react';
import type { GCSObject } from '@/types';

/** element colors */
const colors = {
  page: {
    title:    'text-neutral-100',
    subtitle: 'text-neutral-500',
    loading:  'text-neutral-600',
    empty:    'text-neutral-600',
  },
  breadcrumb: {
    text:  'text-neutral-500',
    hover: 'hover:text-neutral-300',
  },
  fileRow: {
    icon:     'text-neutral-600',
    name:     'text-neutral-300',
    size:     'text-neutral-600',
    playLink: 'text-green-500 hover:underline',
  },
};

function isAudio(name: string) {
  return /\.(mp3|wav|flac|aac|ogg|m4a)$/i.test(name);
}

function sizeLabel(bytes: string) {
  const n = parseInt(bytes, 10);
  if (n > 1_000_000) return `${(n / 1_000_000).toFixed(1)} MB`;
  if (n > 1_000) return `${(n / 1_000).toFixed(0)} KB`;
  return `${n} B`;
}

export default function BrowsePage() {
  const [prefix, setPrefix] = useState('2026/');
  const [objects, setObjects] = useState<GCSObject[]>([]);
  const [loading, setLoading] = useState(false);

  const load = (p: string) => {
    setPrefix(p);
    setLoading(true);
    fetch(`/api/browse?prefix=${encodeURIComponent(p)}`)
      .then(r => r.json())
      .then((data: GCSObject[]) => { setObjects(data); setLoading(false); });
  };

  useEffect(() => { load(prefix); }, []);

  const breadcrumbs = prefix.split('/').filter(Boolean);

  return (
    <div className="max-w-xl">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className={`text-2xl font-bold ${colors.page.title}`}>Browse</h1>
          <p className={`${colors.page.subtitle} text-sm mt-1`}>GCS bucket contents</p>
        </div>
      </div>

      <div className={`flex items-center gap-1 text-xs ${colors.breadcrumb.text} mb-4`}>
        <button onClick={() => load('')} className={colors.breadcrumb.hover}>bucket</button>
        {breadcrumbs.map((crumb, i) => {
          const path = breadcrumbs.slice(0, i + 1).join('/') + '/';
          return (
            <span key={path} className="flex items-center gap-1">
              <span>/</span>
              <button onClick={() => load(path)} className={colors.breadcrumb.hover}>{crumb}</button>
            </span>
          );
        })}
      </div>

      {loading && <p className={`${colors.page.loading} text-sm`}>Loading...</p>}

      <div className="space-y-1">
        {objects.map(obj => {
          const audio = isAudio(obj.name);
          const relName = obj.name.slice(prefix.length);
          return (
            <div key={obj.name} className="flex items-center gap-3 px-3 py-2 rounded hover:bg-neutral-900 group">
              <span className={`${colors.fileRow.icon} text-sm w-4 shrink-0`}>
                {audio ? '♪' : '○'}
              </span>
              <span className={`flex-1 text-sm ${colors.fileRow.name} truncate font-mono`}>{relName}</span>
              <span className={`${colors.fileRow.size} text-xs tabular-nums`}>{sizeLabel(obj.size)}</span>
              {audio && (
                <a href={`/api/audio?path=${encodeURIComponent(obj.name)}`}
                  className={`text-xs ${colors.fileRow.playLink} opacity-0 group-hover:opacity-100 transition-opacity`}
                  target="_blank" rel="noreferrer">
                  play
                </a>
              )}
            </div>
          );
        })}
      </div>

      {!loading && objects.length === 0 && (
        <p className={`${colors.page.empty} text-sm`}>No objects at this prefix.</p>
      )}
    </div>
  );
}
