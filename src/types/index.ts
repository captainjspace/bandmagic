export type TrackStage =
  | "ideation"
  | "writing"
  | "morphing"
  | "tracking"
  | "overdubbing"
  | "mixing"
  | "mastering"
  | "scheduled"
  | "released";

export type TrackStatus =
  | "active"
  | "inactive"
  | "queued"
  | "tabled"
  | "dropped";

export type NextTrackAction =
  | "Finish Music"
  | "Finish Lyrics"
  | "Arrangement"
  | "Track Docs"
  | "Promotional Materials"
  | "ID3 Tagging";

export type Milestone =
  | "Song Complete"
  | "Band Live Ready"
  | "Reference Recordings"
  | "Reference Documentation";

export type AssetType = "drive" | "web";

export type AssetSubtype =
  | "lyrics"
  | "lyrics-stripped"
  | "chord-chart"
  | "lyrics-chords"
  | "ID3-yaml-tag"
  | "press-release"
  | "review"
  | "post"
  | "other";

export interface Asset {
  id: string;
  url: string;
  title: string;
  type: AssetType;
  subtype: AssetSubtype;
  tags?: string[];
  usageCount: number;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
}

export interface AssetLink {
  linkId: string;
  assetId: string;
  linkType?: string;
  addedAt: string;
  addedBy: string;
}

export interface Track {
  path: string;
  title: string;
  stage?: string;
  assets?: AssetLink[];
  tags?: string[];
}

export interface TrackGroup {
  id: string;
  title: string;
  description?: string;
  createdAt: string;
  createdBy: string;
  tracks: Track[];
  assets?: AssetLink[];
  tags?: string[];
  /** email → integer rating. 100 per displayed star (capped at 5); anything
   *  past that is a free tiebreaker so a favorite can be bubbled to the top. */
  ratings?: Record<string, number>;
  /** undefined = active. false = manually shelved. */
  active?: boolean;
  /** YYYY-MM-DD; after this date the group is treated as inactive. */
  activeUntil?: string;
  pinned?: boolean;
}

export interface Note {
  id: string;
  author: string;
  text: string;
  trackPath: string;
  createdAt: string;
  editedAt?: string;
}

export type TaskTargetKind = "track-group" | "song";

export interface Task {
  id: string;
  title: string;
  assignee: string;
  /** Denormalized name so task lists don't N+1 fetch their targets. */
  target: { kind: TaskTargetKind; id: string; name: string };
  done: boolean;
  dueDate?: string;
  createdAt: string;
  createdBy: string;
  completedAt?: string;
  completedBy?: string;
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
  songId?: string;
  stage: string;
  mix: string;
  title: string;
  size?: number;
  syncedAt?: string;
  tags?: string[];
  assets?: AssetLink[];
}

export interface Song {
  id: string;
  name: string;
  aliases?: string[];
  folderPrefix?: string;
  latestPath?: string;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  tags?: string[];
  assets?: AssetLink[];
}
