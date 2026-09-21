import { FieldValue, Firestore, Timestamp } from "@google-cloud/firestore";
import { normalize, SWEEP_THRESHOLD, scoreMatch } from "@/lib/filename-match";
import type { Asset, CatalogEntry, Note, Song, TrackGroup } from "@/types";

const firestoreConfig = {
  databaseId: "bandmagic",
  coredb: "track-groups",
  assetsdb: "assets",
  songsdb: "songs",
};

let _db: Firestore | null = null;
function db() {
  if (!_db)
    _db = new Firestore({
      projectId: process.env.FIRESTORE_PROJECT_ID ?? process.env.GCP_PROJECT_ID,
      databaseId:
        process.env.FIRESTORE_DATABASE_ID ?? "rollingblackoutapp-fsdb",
    });
  return _db;
}

export async function getTrackGroups(): Promise<TrackGroup[]> {
  const snap = await db()
    .collection(firestoreConfig.coredb)
    .orderBy("createdAt", "desc")
    .get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as TrackGroup);
}

export async function getTrackGroup(id: string): Promise<TrackGroup | null> {
  const doc = await db().collection(firestoreConfig.coredb).doc(id).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() } as TrackGroup;
}

export async function createTrackGroup(
  trackGroup: Omit<TrackGroup, "id">,
): Promise<TrackGroup> {
  const ref = await db()
    .collection(firestoreConfig.coredb)
    .add({
      ...trackGroup,
      createdAt: Timestamp.now().toDate().toISOString(),
    });
  await applyAssetUsageDelta(collectAssetLinks(trackGroup));
  const doc = await ref.get();
  return { id: doc.id, ...doc.data() } as TrackGroup;
}

export async function getNotes(
  trackGroupId: string,
  trackPath?: string,
): Promise<Note[]> {
  let query = db()
    .collection(firestoreConfig.coredb)
    .doc(trackGroupId)
    .collection("notes")
    .orderBy("createdAt", "asc") as FirebaseFirestore.Query;
  if (trackPath) query = query.where("trackPath", "==", trackPath);
  const snap = await query.get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Note);
}

export async function addNote(
  trackGroupId: string,
  note: Omit<Note, "id">,
): Promise<Note> {
  const ref = await db()
    .collection(firestoreConfig.coredb)
    .doc(trackGroupId)
    .collection("notes")
    .add({
      ...note,
      createdAt: new Date().toISOString(),
    });
  const doc = await ref.get();
  return { id: doc.id, ...doc.data() } as Note;
}

export async function updateTrackGroup(
  id: string,
  patch: Partial<Omit<TrackGroup, "id">>,
): Promise<TrackGroup> {
  const ref = db().collection(firestoreConfig.coredb).doc(id);
  if (patch.tracks !== undefined || patch.assets !== undefined) {
    await db().runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const old = snap.exists
        ? ({ id: snap.id, ...snap.data() } as TrackGroup)
        : null;
      const oldCounts = old ? collectAssetLinks(old) : {};
      const newCounts = collectAssetLinks({
        tracks: patch.tracks ?? old?.tracks ?? [],
        assets: patch.assets !== undefined ? patch.assets : old?.assets,
      });
      const deltas = diffCounts(oldCounts, newCounts);
      const assetIds = Object.keys(deltas);
      if (assetIds.length > 0) {
        const assetRefs = assetIds.map((aid) =>
          db().collection(firestoreConfig.assetsdb).doc(aid),
        );
        const assetSnaps = await tx.getAll(...assetRefs);
        assetSnaps.forEach((assetSnap, i) => {
          // Asset may already be gone (deleteAsset cleanup races); skip rather than fail the whole save.
          if (!assetSnap.exists) return;
          tx.update(assetRefs[i], {
            usageCount: FieldValue.increment(deltas[assetIds[i]]),
          });
        });
      }
      tx.update(ref, patch);
    });
  } else {
    await ref.update(patch);
  }
  const doc = await ref.get();
  return { id: doc.id, ...doc.data() } as TrackGroup;
}

export async function deleteTrackGroup(id: string): Promise<void> {
  const old = await getTrackGroup(id);
  if (old) {
    const negative: Record<string, number> = {};
    for (const [aid, n] of Object.entries(collectAssetLinks(old)))
      negative[aid] = -n;
    await applyAssetUsageDelta(negative);
  }
  await db().collection(firestoreConfig.coredb).doc(id).delete();
}

// --- assets ---

export async function getAssets(): Promise<Asset[]> {
  const snap = await db()
    .collection(firestoreConfig.assetsdb)
    .orderBy("updatedAt", "desc")
    .get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Asset);
}

export async function getAsset(id: string): Promise<Asset | null> {
  const doc = await db().collection(firestoreConfig.assetsdb).doc(id).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() } as Asset;
}

export async function createAsset(
  input: Omit<Asset, "id" | "createdAt" | "updatedAt" | "usageCount">,
): Promise<Asset> {
  const now = Timestamp.now().toDate().toISOString();
  const ref = await db()
    .collection(firestoreConfig.assetsdb)
    .add({
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
  patch: Partial<Omit<Asset, "id" | "createdAt" | "usageCount">>,
): Promise<Asset> {
  await db()
    .collection(firestoreConfig.assetsdb)
    .doc(id)
    .update({
      ...patch,
      updatedAt: Timestamp.now().toDate().toISOString(),
    });
  const doc = await db().collection(firestoreConfig.assetsdb).doc(id).get();
  return { id: doc.id, ...doc.data() } as Asset;
}

export async function deleteAsset(id: string): Promise<void> {
  try {
    const groups = await getTrackGroups();
    const affected = groups.filter(
      (g) =>
        (g.assets ?? []).some((l) => l.assetId === id) ||
        g.tracks.some((t) => (t.assets ?? []).some((l) => l.assetId === id)),
    );
    if (affected.length > 0) {
      const batch = db().batch();
      for (const g of affected) {
        const ref = db().collection(firestoreConfig.coredb).doc(g.id);
        batch.update(ref, {
          assets: (g.assets ?? []).filter((l) => l.assetId !== id),
          tracks: g.tracks.map((t) => ({
            ...t,
            assets: (t.assets ?? []).filter((l) => l.assetId !== id),
          })),
        });
      }
      await batch.commit();
    }
  } catch (err) {
    // Best-effort reference cleanup; still proceed with the delete either way.
    console.error("deleteAsset reference cleanup failed", err);
  }
  await db().collection(firestoreConfig.assetsdb).doc(id).delete();
}

export async function applyAssetUsageDelta(
  deltas: Record<string, number>,
): Promise<void> {
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
    console.error("applyAssetUsageDelta failed", err);
  }
}

function collectAssetLinks(
  trackGroup: Pick<TrackGroup, "tracks" | "assets">,
): Record<string, number> {
  const counts: Record<string, number> = {};
  const bump = (assetId: string) => {
    counts[assetId] = (counts[assetId] ?? 0) + 1;
  };
  for (const t of trackGroup.tracks) {
    for (const link of t.assets ?? []) bump(link.assetId);
  }
  for (const link of trackGroup.assets ?? []) bump(link.assetId);
  return counts;
}

function diffCounts(
  oldC: Record<string, number>,
  newC: Record<string, number>,
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
  const snap = await db().collection("catalog").orderBy("song").get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as CatalogEntry);
}

export async function syncCatalog(
  entries: Omit<CatalogEntry, "id">[],
): Promise<number> {
  const syncedAt = new Date().toISOString();
  for (let i = 0; i < entries.length; i += 400) {
    const batch = db().batch();
    for (const entry of entries.slice(i, i + 400)) {
      const ref = db()
        .collection("catalog")
        .doc(encodeURIComponent(entry.path));
      batch.set(ref, { ...entry, syncedAt });
    }
    await batch.commit();
  }
  return entries.length;
}

// --- songs ---

export async function getSongs(): Promise<Song[]> {
  const snap = await db()
    .collection(firestoreConfig.songsdb)
    .orderBy("name")
    .get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Song);
}

export async function getSong(id: string): Promise<Song | null> {
  const doc = await db().collection(firestoreConfig.songsdb).doc(id).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() } as Song;
}

export async function updateSong(
  id: string,
  patch: Partial<Pick<Song, "folderPrefix" | "latestPath" | "aliases">>,
  actor: string,
): Promise<void> {
  await db()
    .collection(firestoreConfig.songsdb)
    .doc(id)
    .set(
      {
        ...patch,
        updatedAt: Timestamp.now().toDate().toISOString(),
        updatedBy: actor,
      },
      { merge: true },
    );
}

/**
 * seedSongs - idempotent upsert of the canonical song-name list (from songlist.txt).
 * Re-running with an updated list is safe: existing docs only get aliases/updatedAt
 * touched, createdAt/createdBy are set once.
 */
export async function seedSongs(
  entries: { name: string; aliases?: string[] }[],
  actor: string,
): Promise<{ created: number; updated: number }> {
  let created = 0;
  let updated = 0;
  const now = Timestamp.now().toDate().toISOString();

  for (let i = 0; i < entries.length; i += 400) {
    const chunk = entries.slice(i, i + 400);
    const refs = chunk.map((e) =>
      db().collection(firestoreConfig.songsdb).doc(encodeURIComponent(e.name)),
    );
    const existing = await db().getAll(...refs);

    const batch = db().batch();
    chunk.forEach((entry, idx) => {
      const exists = existing[idx].exists;
      batch.set(
        refs[idx],
        {
          name: entry.name,
          aliases: entry.aliases ?? [],
          updatedAt: now,
          updatedBy: actor,
          ...(exists ? {} : { createdAt: now, createdBy: actor }),
        },
        { merge: true },
      );
      if (exists) updated++;
      else created++;
    });
    await batch.commit();
  }

  return { created, updated };
}

/** normalize() collapsed to a single token, so "NightAngel" and "Night Angel" compare equal. */
function squash(s: string): string {
  return normalize(s).replace(/\s+/g, "");
}

/**
 * Real folder/file names are often a concatenated or abbreviated form of the canonical
 * title (`NightAngel`, `MagiCali2`, `TangerineDream`) rather than a spaced match, so
 * scoreMatch() alone (which compares normalize()'d, space-preserving strings) misses
 * most of them. Fall back to a squashed-string containment check.
 */
function songScore(candidate: string, target: string): number {
  const direct = scoreMatch(candidate, target);
  if (direct > 0) return direct;
  const a = squash(candidate),
    b = squash(target);
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (a.includes(b) || b.includes(a)) return 0.7;
  return 0;
}

/**
 * matchSong - find the best-scoring Song for a catalog filename or folder segment,
 * fuzzy-matched (via songScore) against each Song's name and aliases.
 */
export function matchSong(
  songs: Song[],
  filenameOrFolder: string,
): Song | undefined {
  const candidates = (s: Song) => [s.name, ...(s.aliases ?? [])];

  let best: { song: Song; score: number } | undefined;
  for (const s of songs) {
    for (const c of candidates(s)) {
      const score = songScore(filenameOrFolder, c);
      if (score >= SWEEP_THRESHOLD && (!best || score > best.score))
        best = { song: s, score };
    }
  }
  return best?.song;
}

/**
 * renameCollection - utility function
 * this simple collection copy from old to new  in batch
 */
export async function renameCollection(oldName: string, newName: string) {
  const oldCollectionRef = db().collection(oldName);

  // Fetch all documents from the old collection
  const snapshot = await oldCollectionRef.get();

  if (snapshot.empty) {
    console.log("No documents found to migrate.");
    return;
  }

  let batch = db().batch();
  let operationCount = 0;

  console.debug(`Preparing to migrate ${snapshot.size} documents`);
  for (const docSnapshot of snapshot.docs) {
    const data = docSnapshot.data();

    // 1. Point to the new location using the exact same document ID
    const newDocRef = db().collection(newName).doc(docSnapshot.id);
    batch.set(newDocRef, data);
    operationCount++;
    // 2. Queue the delete operation for the old location
    const oldDocRef = oldCollectionRef.doc(docSnapshot.id);
    batch.delete(oldDocRef);
    operationCount++;

    // Commit when approaching the maximum 500 operations per batch limit
    if (operationCount >= 400) {
      await batch.commit();
      batch = db().batch(); // Reset for the next chunk
      operationCount = 0;
    }
  }

  // Commit any remaining operations left in the final batch
  if (operationCount > 0) {
    await batch.commit();
  }

  console.log(`Successfully migrated ${snapshot.size} documents server-side.`);
}

/**
 * migrateAssetIdsToAssetLinks - one-off utility, run manually before deploying
 * the AssetLink[] shape change. Converts every track's old `assetIds: string[]`
 * into `assets: AssetLink[]`, and backfills an empty `assets: []` at the group
 * level where missing. Idempotent: re-running is a no-op for docs already migrated.
 */
export async function migrateAssetIdsToAssetLinks() {
  const snapshot = await db().collection(firestoreConfig.coredb).get();
  if (snapshot.empty) {
    console.log("No track groups found to migrate.");
    return;
  }

  let batch = db().batch();
  let operationCount = 0;
  let migratedDocs = 0;

  for (const docSnapshot of snapshot.docs) {
    const data = docSnapshot.data() as {
      tracks?: {
        path: string;
        title: string;
        stage?: string;
        assetIds?: string[];
        assets?: unknown;
      }[];
      assets?: unknown;
    };
    const needsTrackMigration = (data.tracks ?? []).some(
      (t) => Array.isArray(t.assetIds) && t.assets === undefined,
    );
    const needsGroupBackfill = data.assets === undefined;
    if (!needsTrackMigration && !needsGroupBackfill) continue;

    const now = new Date().toISOString();
    const tracks = (data.tracks ?? []).map((t) => {
      if (t.assets !== undefined) return t;
      const { assetIds, ...rest } = t;
      return {
        ...rest,
        assets: (assetIds ?? []).map((assetId) => ({
          linkId: Math.random().toString(36).slice(2) + Date.now().toString(36),
          assetId,
          addedAt: now,
          addedBy: "migration",
        })),
      };
    });

    batch.update(docSnapshot.ref, { tracks, assets: data.assets ?? [] });
    operationCount++;
    migratedDocs++;

    if (operationCount >= 400) {
      await batch.commit();
      batch = db().batch();
      operationCount = 0;
    }
  }

  if (operationCount > 0) {
    await batch.commit();
  }

  console.log(
    `Migrated ${migratedDocs} of ${snapshot.size} track group documents.`,
  );
}
