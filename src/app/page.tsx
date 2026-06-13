export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { config } from '@/lib/config';
import { getReleases } from '@/lib/firestore';
import { mockReleases } from '@/lib/mock';
import { stageClass } from '@/lib/stage';
import type { Release } from '@/types';

/** element colors */
const colors = {
  page: {
    title: 'text-rbblue-600',
    count: 'text-neutral-500',
  },
  releaseCard: {
    title:       'text-rbyellow-700 group-hover:text-cyan-400',
    description: 'text-gradient-brand',
    meta:        'text-rbpurple-600',
    separator:   'text-rbpurple-700',
    editLink:    'text-rbpurple-600 hover:text-neutral-400',
    emptyText:   'text-rbpurple-600',
    emptyLink:   'text-cyan-400 hover:underline',
  },
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
        <h1 className={`text-2xl font-bold ${colors.page.title} tracking-tight`}>Releases</h1>
        <p className={`${colors.page.count} text-sm mt-1`}>{releases.length} release{releases.length !== 1 ? 's' : ''}</p>
      </div>

      {releases.length === 0 && (
        <p className={`${colors.releaseCard.emptyText} text-sm`}>
          No releases yet. <Link href="/admin" className={colors.releaseCard.emptyLink}>Create one.</Link>
        </p>
      )}

      <div className="space-y-4">
        {releases.map(release => (
          <div key={release.id} className="border border-neutral-800 rounded-lg hover:border-neutral-600 hover:bg-neutral-900 transition-all group">
            <div className="flex items-start gap-4">
              <Link href={`/release/${release.id}`} className="flex-1 min-w-0 p-5">
                <h2 className={`${colors.releaseCard.title} font-semibold transition-colors truncate`}>
                  {release.title}
                </h2>
                {release.description && (
                  <p className={`${colors.releaseCard.description} text-sm mt-1 line-clamp-2`}>{release.description}</p>
                )}
                <div className="flex items-center gap-3 mt-3">
                  {(() => { const n = release.tracks.filter(t => t.path?.trim()).length; return (
                    <span className={`${colors.releaseCard.meta} text-xs`}>{n} track{n !== 1 ? 's' : ''}</span>
                  ); })()}
                  <span className={`${colors.releaseCard.separator}`}>·</span>
                  <span className={`${colors.releaseCard.meta} text-xs`}>{new Date(release.createdAt).toLocaleDateString()}</span>
                  <div className="flex gap-1.5 ml-1">
                    {[...new Set(release.tracks.filter(t => t.path?.trim()).map(t => t.stage).filter(Boolean))].map(stage => (
                      <span key={stage} className={`text-xs border px-1.5 py-0.5 rounded ${stageClass(stage)}`}>
                        {stage}
                      </span>
                    ))}
                  </div>
                </div>
              </Link>
              <Link href={`/admin/${release.id}`}
                className={`${colors.releaseCard.editLink} text-xs px-3 py-5 hover:bg-neutral-800 rounded-r-lg transition-colors shrink-0`}>
                Edit
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
