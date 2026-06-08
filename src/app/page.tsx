export const dynamic = 'force-dynamic';

import { config } from '@/lib/config';
import { getReleases } from '@/lib/firestore';
import { mockReleases } from '@/lib/mock';
import type { Release } from '@/types';

const STAGE_COLORS: Record<string, string> = {
  writing: 'text-blue-400 border-blue-800',
  tracking: 'text-yellow-400 border-yellow-800',
  mixing: 'text-orange-400 border-orange-800',
  mastering: 'text-green-400 border-green-800',
};

async function getReleasesList(): Promise<Release[]> {
  if (config.useMock) return mockReleases;
  return getReleases();
}

export default async function HomePage() {
  const releases = await getReleasesList();

  return (
    <div>
      <div className="mb-10">
        <h1 className="text-2xl font-bold text-neutral-100 tracking-tight">Releases</h1>
        <p className="text-neutral-500 text-sm mt-1">{releases.length} release{releases.length !== 1 ? 's' : ''}</p>
      </div>

      {releases.length === 0 && (
        <p className="text-neutral-600 text-sm">No releases yet. <a href="/admin" className="text-green-400 hover:underline">Create one.</a></p>
      )}

      <div className="space-y-4">
        {releases.map(release => (
          <a key={release.id} href={`/release/${release.id}`}
            className="block border border-neutral-800 rounded-lg p-5 hover:border-neutral-600 hover:bg-neutral-900 transition-all group">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h2 className="text-neutral-100 font-semibold group-hover:text-green-400 transition-colors truncate">
                  {release.title}
                </h2>
                {release.description && (
                  <p className="text-neutral-500 text-sm mt-1 line-clamp-2">{release.description}</p>
                )}
                <div className="flex items-center gap-3 mt-3">
                  <span className="text-neutral-600 text-xs">{release.tracks.length} track{release.tracks.length !== 1 ? 's' : ''}</span>
                  <span className="text-neutral-700">·</span>
                  <span className="text-neutral-600 text-xs">{new Date(release.createdAt).toLocaleDateString()}</span>
                  <div className="flex gap-1.5 ml-1">
                    {[...new Set(release.tracks.map(t => t.stage).filter(Boolean))].map(stage => (
                      <span key={stage} className={`text-xs border px-1.5 py-0.5 rounded ${STAGE_COLORS[stage!] ?? 'text-neutral-400 border-neutral-700'}`}>
                        {stage}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <span className="text-neutral-600 group-hover:text-neutral-400 text-lg mt-0.5 shrink-0">→</span>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
