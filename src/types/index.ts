export interface Track {
  path: string;
  title: string;
  stage?: string;
  docPath?: string;
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
