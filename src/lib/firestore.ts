import { Firestore, Timestamp } from '@google-cloud/firestore';
import type { Release, Note, CatalogEntry } from '@/types';

let _db: Firestore | null = null;
function db() {
  if (!_db) _db = new Firestore({
    projectId: process.env.FIRESTORE_PROJECT_ID ?? process.env.GCP_PROJECT_ID,
    databaseId: process.env.FIRESTORE_DATABASE_ID ?? '(default)',
  });
  return _db;
}

export async function getReleases(): Promise<Release[]> {
  const snap = await db().collection('releases').orderBy('createdAt', 'desc').get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Release));
}

export async function getRelease(id: string): Promise<Release | null> {
  const doc = await db().collection('releases').doc(id).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() } as Release;
}

export async function createRelease(release: Omit<Release, 'id'>): Promise<Release> {
  const ref = await db().collection('releases').add({
    ...release,
    createdAt: Timestamp.now().toDate().toISOString(),
  });
  const doc = await ref.get();
  return { id: doc.id, ...doc.data() } as Release;
}

export async function getNotes(releaseId: string, trackPath?: string): Promise<Note[]> {
  let query = db().collection('releases').doc(releaseId).collection('notes').orderBy('createdAt', 'asc') as FirebaseFirestore.Query;
  if (trackPath) query = query.where('trackPath', '==', trackPath);
  const snap = await query.get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Note));
}

export async function addNote(releaseId: string, note: Omit<Note, 'id'>): Promise<Note> {
  const ref = await db().collection('releases').doc(releaseId).collection('notes').add({
    ...note,
    createdAt: new Date().toISOString(),
  });
  const doc = await ref.get();
  return { id: doc.id, ...doc.data() } as Note;
}

export async function updateRelease(id: string, patch: Partial<Omit<Release, 'id'>>): Promise<Release> {
  await db().collection('releases').doc(id).update(patch);
  const doc = await db().collection('releases').doc(id).get();
  return { id: doc.id, ...doc.data() } as Release;
}

export async function deleteRelease(id: string): Promise<void> {
  await db().collection('releases').doc(id).delete();
}

export async function getCatalog(): Promise<CatalogEntry[]> {
  const snap = await db().collection('catalog').orderBy('song').get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as CatalogEntry));
}

export async function syncCatalog(entries: Omit<CatalogEntry, 'id'>[]): Promise<number> {
  const syncedAt = new Date().toISOString();
  for (let i = 0; i < entries.length; i += 400) {
    const batch = db().batch();
    for (const entry of entries.slice(i, i + 400)) {
      const ref = db().collection('catalog').doc(encodeURIComponent(entry.path));
      batch.set(ref, { ...entry, syncedAt });
    }
    await batch.commit();
  }
  return entries.length;
}
