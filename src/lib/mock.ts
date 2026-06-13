import type { Release, Note, CatalogEntry } from '@/types';

export const mockReleases: Release[] = [
  {
    id: '0793FB3A-1CC8-4A00-B17E-4673A05C27FA',
    title: 'June 2026 Rough Cuts',
    description: '13 tracks — rough cuts, demos, and jams from the current writing session.',
    createdAt: '2026-06-08T00:00:00Z',
    createdBy: 'joshgcp@rollingblackoutband.com',
    tracks: [
      { path: '2026/2025-01-15-DarkBox-NightAngel.mp3', title: 'Dark Box Night Angel' },
      { path: '2026/MAGICAL.mp3', title: 'Magical' },
      { path: '2026/MagiCali.mp3', title: 'MagiCali' },
      { path: '2026/MagiCali2.mp3', title: 'MagiCali 2' },
      { path: '2026/Rainbow Galaxy.mp3', title: 'Rainbow Galaxy' },
      { path: '2026/StraightJazzCock-FakePurpleTele.mp3', title: 'Straight Jazz Cock — Fake Purple Tele' },
      { path: '2026/childofthe80s.mp3', title: 'Child of the 80s' },
      { path: '2026/genyp1.mp3', title: 'Gen YP 1' },
      { path: '2026/jambuglogicx.mp3', title: 'Jam Bug Logic X' },
      { path: '2026/paperthinjazz2.mp3', title: 'Paper Thin Jazz 2' },
      { path: '2026/sexy locnar.mp3', title: 'Sexy Locnar' },
      { path: '2026/thecrown of thorns.mp3', title: 'The Crown of Thorns' },
    ],
  },
];

export const mockNotes: Note[] = [];

export const mockCatalog: CatalogEntry[] = mockReleases[0].tracks
  .filter(t => t.path?.trim())
  .map(t => ({
    id: encodeURIComponent(t.path),
    path: t.path,
    song: t.path.split('/').pop()?.replace(/\.[^.]+$/, '') ?? t.path,
    stage: t.stage ?? 'mixing',
    mix: t.path.split('/').pop()?.replace(/\.[^.]+$/, '') ?? '',
    title: t.title,
  }));
