import { Firestore, Timestamp, FieldValue } from '@google-cloud/firestore';
import type { Release, Note, CatalogEntry, Asset, Track } from '@/types';

const firestoreConfig = {
  databaseId: "bandmagic",
  coredb: "releases",
  assetsdb: "assets",
}


let _db: Firestore | null = null;
function db() {
  if (!_db) _db = new Firestore({
    projectId: process.env.FIRESTORE_PROJECT_ID ?? process.env.GCP_PROJECT_ID,
    databaseId: process.env.FIRESTORE_DATABASE_ID ?? 'rollingblackoutapp-fsdb',
  });
  return _db;
}

export async function getReleases(): Promise<Release[]> {
  const snap = await db().collection(firestoreConfig.coredb).orderBy('createdAt', 'desc').get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Release));
}

export async function getRelease(id: string): Promise<Release | null> {
  const doc = await db().collection(firestoreConfig.coredb).doc(id).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() } as Release;
}

export async function createRelease(release: Omit<Release, 'id'>): Promise<Release> {
  const ref = await db().collection(firestoreConfig.coredb).add({
    ...release,
    createdAt: Timestamp.now().toDate().toISOString(),
  });
  await applyAssetUsageDelta(countAssetIds(release.tracks));
  const doc = await ref.get();
  return { id: doc.id, ...doc.data() } as Release;
}

export async function getNotes(releaseId: string, trackPath?: string): Promise<Note[]> {
  let query = db().collection(firestoreConfig.coredb).doc(releaseId).collection('notes').orderBy('createdAt', 'asc') as FirebaseFirestore.Query;
  if (trackPath) query = query.where('trackPath', '==', trackPath);
  const snap = await query.get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Note));
}

export async function addNote(releaseId: string, note: Omit<Note, 'id'>): Promise<Note> {
  const ref = await db().collection(firestoreConfig.coredb).doc(releaseId).collection('notes').add({
    ...note,
    createdAt: new Date().toISOString(),
  });
  const doc = await ref.get();
  return { id: doc.id, ...doc.data() } as Note;
}

export async function updateRelease(id: string, patch: Partial<Omit<Release, 'id'>>): Promise<Release> {
  if (patch.tracks !== undefined) {
    const old = await getRelease(id);
    const oldCounts = old ? countAssetIds(old.tracks) : {};
    const newCounts = countAssetIds(patch.tracks);
    await applyAssetUsageDelta(diffCounts(oldCounts, newCounts));
  }
  await db().collection(firestoreConfig.coredb).doc(id).update(patch);
  const doc = await db().collection(firestoreConfig.coredb).doc(id).get();
  return { id: doc.id, ...doc.data() } as Release;
}

export async function deleteRelease(id: string): Promise<void> {
  const old = await getRelease(id);
  if (old) {
    const negative: Record<string, number> = {};
    for (const [aid, n] of Object.entries(countAssetIds(old.tracks))) negative[aid] = -n;
    await applyAssetUsageDelta(negative);
  }
  await db().collection(firestoreConfig.coredb).doc(id).delete();
}

// --- assets ---

export async function getAssets(): Promise<Asset[]> {
  const snap = await db().collection(firestoreConfig.assetsdb).orderBy('updatedAt', 'desc').get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Asset));
}

export async function getAsset(id: string): Promise<Asset | null> {
  const doc = await db().collection(firestoreConfig.assetsdb).doc(id).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() } as Asset;
}

export async function createAsset(
  input: Omit<Asset, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'>
): Promise<Asset> {
  const now = Timestamp.now().toDate().toISOString();
  const ref = await db().collection(firestoreConfig.assetsdb).add({
    ...input,
    usageCount: 0,
    createdAt: now,
    updatedAt: now,
  });
  const doc = await ref.get();
  return { id: doc.id, ...doc.data() } as Asset;
}

export async function updateAsset(
  id: string,
  patch: Partial<Omit<Asset, 'id' | 'createdAt' | 'usageCount'>>
): Promise<Asset> {
  await db().collection(firestoreConfig.assetsdb).doc(id).update({
    ...patch,
    updatedAt: Timestamp.now().toDate().toISOString(),
  });
  const doc = await db().collection(firestoreConfig.assetsdb).doc(id).get();
  return { id: doc.id, ...doc.data() } as Asset;
}

export async function deleteAsset(id: string): Promise<void> {
  await db().collection(firestoreConfig.assetsdb).doc(id).delete();
}

export async function applyAssetUsageDelta(deltas: Record<string, number>): Promise<void> {
  const entries = Object.entries(deltas).filter(([, d]) => d !== 0);
  if (entries.length === 0) return;
  const batch = db().batch();
  for (const [id, delta] of entries) {
    const ref = db().collection(firestoreConfig.assetsdb).doc(id);
    batch.update(ref, { usageCount: FieldValue.increment(delta) });
  }
  try {
    await batch.commit();
  } catch (err) {
    // Best-effort denormalized counter; BigQuery sync will reconcile.
    console.error('applyAssetUsageDelta failed', err);
  }
}

function countAssetIds(tracks: Track[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const t of tracks) {
    for (const id of t.assetIds ?? []) {
      counts[id] = (counts[id] ?? 0) + 1;
    }
  }
  return counts;
}

function diffCounts(
  oldC: Record<string, number>,
  newC: Record<string, number>
): Record<string, number> {
  const ids = new Set([...Object.keys(oldC), ...Object.keys(newC)]);
  const out: Record<string, number> = {};
  for (const id of ids) {
    const d = (newC[id] ?? 0) - (oldC[id] ?? 0);
    if (d !== 0) out[id] = d;
  }
  return out;
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
