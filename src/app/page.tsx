export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { config } from '@/lib/config';
import { getTrackGroups } from '@/lib/firestore';
import { mockTrackGroups } from '@/lib/mock';
import { stageClass } from '@/lib/stage';
import type { TrackGroup } from '@/types';

/** element colors */
const colors = {
  page: {
    title: 'text-rbblue-600',
    count: 'text-neutral-500',
  },
  trackGroupCard: {
    title:       'text-rbyellow-700 group-hover:text-cyan-400',
    description: 'text-gradient-brand',
    meta:        'text-rbpurple-600',
    separator:   'text-rbpurple-700',
    editLink:    'text-rbpurple-600 hover:text-neutral-400',
    emptyText:   'text-rbpurple-600',
    emptyLink:   'text-cyan-400 hover:underline',
  },
};

async function getTrackGroupsList(): Promise<TrackGroup[]> {
  if (config.useMock) return mockTrackGroups;
  return getTrackGroups();
}

export default async function HomePage() {
  const trackGroups = await getTrackGroupsList();

  return (
    <div>
      <div className="mb-10">
        <h1 className={`text-2xl font-bold ${colors.page.title} tracking-tight`}>TrackGroups</h1>
        <p className={`${colors.page.count} text-sm mt-1`}>{trackGroups.length} trackGroup{trackGroups.length !== 1 ? 's' : ''}</p>
      </div>

      {trackGroups.length === 0 && (
        <p className={`${colors.trackGroupCard.emptyText} text-sm`}>
          No trackGroups yet. <Link href="/admin" className={colors.trackGroupCard.emptyLink}>Create one.</Link>
        </p>
      )}

      <div className="space-y-4">
        {trackGroups.map(trackGroup => (
          <div key={trackGroup.id} className="border border-neutral-800 rounded-lg hover:border-neutral-600 hover:bg-neutral-900 transition-all group">
            <div className="flex items-start gap-4">
              <Link href={`/track-group/${trackGroup.id}`} className="flex-1 min-w-0 p-5">
                <h2 className={`${colors.trackGroupCard.title} font-semibold transition-colors truncate`}>
                  {trackGroup.title}
                </h2>
                {trackGroup.description && (
                  <p className={`${colors.trackGroupCard.description} text-sm mt-1 line-clamp-2`}>{trackGroup.description}</p>
                )}
                <div className="flex items-center gap-3 mt-3">
                  {(() => { const n = trackGroup.tracks.filter(t => t.path?.trim()).length; return (
                    <span className={`${colors.trackGroupCard.meta} text-xs`}>{n} track{n !== 1 ? 's' : ''}</span>
                  ); })()}
                  <span className={`${colors.trackGroupCard.separator}`}>·</span>
                  <span className={`${colors.trackGroupCard.meta} text-xs`}>{new Date(trackGroup.createdAt).toLocaleDateString()}</span>
                  <div className="flex gap-1.5 ml-1">
                    {[...new Set(trackGroup.tracks.filter(t => t.path?.trim()).map(t => t.stage).filter(Boolean))].map(stage => (
                      <span key={stage} className={`text-xs border px-1.5 py-0.5 rounded ${stageClass(stage)}`}>
                        {stage}
                      </span>
                    ))}
                  </div>
                </div>
              </Link>
              <Link href={`/admin/${trackGroup.id}`}
                className={`${colors.trackGroupCard.editLink} text-xs px-3 py-5 hover:bg-neutral-800 rounded-r-lg transition-colors shrink-0`}>
                Edit
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
