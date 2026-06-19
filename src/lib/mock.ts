import type { TrackGroup, Note, CatalogEntry, Asset } from '@/types';
import type { DriveFile } from '@/lib/drive';
import driveExport from '../../mocks/drive-files.json';

/** Minimal shape from the Drive API Explorer export — only the fields the export includes. */
type RawDriveFile = {
  kind: string;
  mimeType: string;
  id: string;
  name: string;
  resourceKey?: string;
};

function webViewLinkFor(mime: string, id: string): string {
  if (mime === 'application/vnd.google-apps.document')     return `https://docs.google.com/document/d/${id}`;
  if (mime === 'application/vnd.google-apps.spreadsheet')  return `https://docs.google.com/spreadsheets/d/${id}`;
  if (mime === 'application/vnd.google-apps.presentation') return `https://docs.google.com/presentation/d/${id}`;
  if (mime === 'application/vnd.google-apps.folder')       return `https://drive.google.com/drive/folders/${id}`;
  return `https://drive.google.com/file/d/${id}/view`;
}

export const mockDriveFiles: DriveFile[] = (driveExport as { files: RawDriveFile[] }).files.map(f => ({
  id: f.id,
  name: f.name,
  mimeType: f.mimeType,
  webViewLink: webViewLinkFor(f.mimeType, f.id),
  modifiedTime: '2026-06-19T00:00:00Z',
  owners: [{ emailAddress: 'joshgcp@rollingblackoutband.com', displayName: 'Joshua Landman' }],
}));

export const mockAssets: Asset[] = [
  {
    id: 'mock-asset-lyrics-magical',
    url: 'https://docs.google.com/document/d/example-magical-lyrics',
    title: 'Magical — lyrics (working)',
    type: 'drive',
    subtype: 'lyrics',
    usageCount: 1,
    createdAt: '2026-06-10T00:00:00Z',
    createdBy: 'joshgcp@rollingblackoutband.com',
    updatedAt: '2026-06-15T00:00:00Z',
    updatedBy: 'joshgcp@rollingblackoutband.com',
  },
  {
    id: 'mock-asset-review-magicali',
    url: 'https://somemusicblog.example.com/posts/magicali-review',
    title: 'MagiCali review — Some Music Blog',
    type: 'web',
    subtype: 'review',
    usageCount: 1,
    createdAt: '2026-06-12T00:00:00Z',
    createdBy: 'joshgcp@rollingblackoutband.com',
    updatedAt: '2026-06-12T00:00:00Z',
    updatedBy: 'joshgcp@rollingblackoutband.com',
  },
];

export const mockTrackGroups: TrackGroup[] = [
  {
    id: '0793FB3A-1CC8-4A00-B17E-4673A05C27FA',
    title: 'June 2026 Rough Cuts',
    description: '13 tracks — rough cuts, demos, and jams from the current writing session.',
    createdAt: '2026-06-08T00:00:00Z',
    createdBy: 'joshgcp@rollingblackoutband.com',
    tracks: [
      { path: '2026/2025-01-15-DarkBox-NightAngel.mp3', title: 'Dark Box Night Angel' },
      { path: '2026/MAGICAL.mp3', title: 'Magical', assetIds: ['mock-asset-lyrics-magical'] },
      { path: '2026/MagiCali.mp3', title: 'MagiCali', assetIds: ['mock-asset-review-magicali'] },
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

export const mockCatalog: CatalogEntry[] = mockTrackGroups[0].tracks
  .filter(t => t.path?.trim())
  .map(t => ({
    id: encodeURIComponent(t.path),
    path: t.path,
    song: t.path.split('/').pop()?.replace(/\.[^.]+$/, '') ?? t.path,
    stage: t.stage ?? 'mixing',
    mix: t.path.split('/').pop()?.replace(/\.[^.]+$/, '') ?? '',
    title: t.title,
  }));
