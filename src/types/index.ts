export type TrackStage =
  | 'ideation' | 'writing' | 'morphing' | 'tracking'
  | 'overdubbing' | 'mixing' | 'mastering' | 'scheduled' | 'released';

export type TrackStatus = 'active' | 'inactive' | 'queued' | 'tabled' | 'dropped';

export type NextTrackAction =
  | 'Finish Music' | 'Finish Lyrics' | 'Arrangement'
  | 'Track Docs' | 'Promotional Materials' | 'ID3 Tagging';

export type Milestone =
  | 'Song Complete' | 'Band Live Ready'
  | 'Reference Recordings' | 'Reference Documentation';

export type DocLinkType = 'sheet-music' | 'chart' | 'lyrics' | 'other';

export interface DocLink {
  url: string;
  title: string;
  type: DocLinkType;
}

export interface Track {
  path: string;
  title: string;
  stage?: string;
  docPath?: string;
  docLinks?: DocLink[];
}

export interface Release {
  id: string;
  title: string;
  description?: string;
  createdAt: string;
  createdBy: string;
  tracks: Track[];
}

export interface Note {
  id: string;
  author: string;
  text: string;
  trackPath: string;
  createdAt: string;
}

export interface GCSObject {
  name: string;
  size: string;
  updated: string;
  contentType?: string;
}

export interface CatalogEntry {
  id: string;
  path: string;
  song: string;
  stage: string;
  mix: string;
  title: string;
  size?: number;
  syncedAt?: string;
}
