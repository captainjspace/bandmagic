import { NextRequest, NextResponse } from 'next/server';
import { config } from '@/lib/config';
import { searchFiles, type DriveFile } from '@/lib/drive';
import { getRelease, updateRelease, getAssets, createAsset } from '@/lib/firestore';
import { mockDriveFiles } from '@/lib/mock';
import { scoreMatch, SWEEP_THRESHOLD, inferSubtype } from '@/lib/filename-match';
import { errorResponse, isDebugUser } from '@/lib/debug-mode';
import type { Track } from '@/types';

type SweepError = { trackPath: string; trackTitle: string; reason: string };
type SweepResponse = {
  proposed: number;
  created: number;
  attached: number;
  errors: SweepError[];
};

export async function POST(req: NextRequest) {
  const body = await req.json() as { releaseId?: string };
  const releaseId = body.releaseId?.trim();
  if (!releaseId) return NextResponse.json({ error: 'releaseId required' }, { status: 400 });

  const userEmail = req.headers.get('x-goog-authenticated-user-email')?.replace('accounts.google.com:', '')
    ?? process.env.LOCAL_USER_EMAIL
    ?? '';

  if (config.useMock) {
    return NextResponse.json(mockSweep());
  }

  const debug = isDebugUser(userEmail);

  let release: Awaited<ReturnType<typeof getRelease>>;
  let existingAssets: Awaited<ReturnType<typeof getAssets>>;
  try {
    release = await getRelease(releaseId);
    if (!release) return NextResponse.json({ error: 'Release not found' }, { status: 404 });
    existingAssets = await getAssets();
  } catch (e) {
    const { body, status } = errorResponse(e, {
      userEmail,
      fallback: 'Sweep prep failed.',
      logTag: 'sweep-drive/prep',
    });
    return NextResponse.json(body, { status });
  }

  const assetByUrl = new Map(existingAssets.map(a => [normUrl(a.url), a]));

  const errors: SweepError[] = [];
  let proposed = 0;
  let created = 0;
  let attached = 0;
  let releaseChanged = false;

  const newTracks: Track[] = [];
  for (const track of release.tracks) {
    if (!track.title.trim()) { newTracks.push(track); continue; }

    let driveResults: DriveFile[] = [];
    try {
      driveResults = await searchFiles({ userEmail, q: track.title, folderId: config.driveFolderId || undefined });
    } catch (e) {
      console.error('[sweep-drive/search]', track.title, e);
      errors.push({
        trackPath: track.path,
        trackTitle: track.title,
        reason: debug && e instanceof Error ? e.message : 'Drive search failed',
      });
      newTracks.push(track);
      continue;
    }

    const matches = driveResults
      .map(f => ({ file: f, score: scoreMatch(f.name, track.title) }))
      .filter(m => m.score >= SWEEP_THRESHOLD)
      .sort((a, b) => b.score - a.score);

    if (matches.length === 0) { newTracks.push(track); continue; }
    proposed += matches.length;

    const assetIds = new Set(track.assetIds ?? []);
    const startCount = assetIds.size;

    for (const { file } of matches) {
      const key = normUrl(file.webViewLink);
      let asset = assetByUrl.get(key);
      if (!asset) {
        try {
          asset = await createAsset({
            url: file.webViewLink,
            title: file.name,
            type: 'drive',
            subtype: inferSubtype(file.name),
            createdBy: userEmail || 'sweep',
            updatedBy: userEmail || 'sweep',
          });
          assetByUrl.set(key, asset);
          created++;
        } catch (e) {
          console.error('[sweep-drive/createAsset]', file.name, e);
          errors.push({
            trackPath: track.path,
            trackTitle: track.title,
            reason: debug && e instanceof Error ? e.message : 'Asset create failed',
          });
          continue;
        }
      }
      assetIds.add(asset.id);
    }

    if (assetIds.size > startCount) {
      attached += assetIds.size - startCount;
      newTracks.push({ ...track, assetIds: [...assetIds] });
      releaseChanged = true;
    } else {
      newTracks.push(track);
    }
  }

  if (releaseChanged) {
    try {
      await updateRelease(releaseId, { tracks: newTracks });
    } catch (e) {
      console.error('[sweep-drive/updateRelease]', e);
      errors.push({
        trackPath: '',
        trackTitle: '(release save)',
        reason: debug && e instanceof Error ? e.message : 'Release update failed',
      });
    }
  }

  const response: SweepResponse = { proposed, created, attached, errors };
  return NextResponse.json(response);
}

function normUrl(url: string): string {
  return url.replace(/[?#].*$/, '').toLowerCase();
}

function mockSweep(): SweepResponse {
  return {
    proposed: mockDriveFiles.length,
    created: 0,
    attached: 0,
    errors: [{ trackPath: '', trackTitle: '(mock)', reason: 'Mock mode — no Firestore changes' }],
  };
}
