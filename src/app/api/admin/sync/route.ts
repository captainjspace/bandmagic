import { NextResponse } from 'next/server';
import { config } from '@/lib/config';
import { listObjects, isAudio, stageFromPath, titleFromPath } from '@/lib/gcs';
import { syncCatalog } from '@/lib/firestore';

export async function POST() {
  if (config.useMock) return NextResponse.json({ synced: 0, message: 'mock mode' });

  const objects = await listObjects(config.prefix);
  const audio = objects.filter(o => isAudio(o.name));

  const entries = audio.map(o => {
    const parts = o.name.split('/');
    const filename = parts[parts.length - 1];
    const mix = filename.replace(/\.[^.]+$/, '');
    const stage = stageFromPath(o.name) ?? 'unknown';
    // song is the folder directly containing the file, or filename if flat
    const song = parts.length >= 3 ? parts[parts.length - 2] : mix;
    const title = titleFromPath(o.name);
    return {
      path: o.name,
      song,
      stage,
      mix,
      title,
      size: Number(o.size),
    };
  });

  const synced = await syncCatalog(entries);
  return NextResponse.json({ synced, message: `${synced} tracks indexed` });
}
