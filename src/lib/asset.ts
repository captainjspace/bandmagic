import type { AssetLink, AssetSubtype, AssetType } from "@/types";

const KNOWN_SUBTYPES = new Set<AssetSubtype>([
  "lyrics",
  "lyrics-stripped",
  "chord-chart",
  "lyrics-chords",
  "ID3-yaml-tag",
  "press-release",
  "review",
  "post",
  "other",
]);

export function assetClass(subtype?: string): string {
  return KNOWN_SUBTYPES.has(subtype as AssetSubtype)
    ? `asset-${subtype}`
    : "asset-other";
}

export function assetBgClass(subtype?: string): string {
  return KNOWN_SUBTYPES.has(subtype as AssetSubtype)
    ? `asset-${subtype}-bg`
    : "";
}

export function inferAssetType(url: string): AssetType {
  return /https?:\/\/(docs|drive)\.google\.com\//i.test(url) ? "drive" : "web";
}

export function driveDocKind(url: string): "doc" | "sheet" | "slide" | null {
  if (/docs\.google\.com\/document\//i.test(url)) return "doc";
  if (/docs\.google\.com\/spreadsheets\//i.test(url)) return "sheet";
  if (/docs\.google\.com\/presentation\//i.test(url)) return "slide";
  return null;
}

export function uid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function assetLinkIds(links?: AssetLink[]): string[] {
  return (links ?? []).map((l) => l.assetId);
}

/** Reconciles a flat list of selected assetIds (from AssetPicker) against existing AssetLinks,
 *  preserving linkId/addedAt/addedBy for ids that were already attached. */
export function reconcileAssetLinks(
  existing: AssetLink[] | undefined,
  nextIds: string[],
  addedBy: string,
): AssetLink[] {
  const byAssetId = new Map((existing ?? []).map((l) => [l.assetId, l]));
  const now = new Date().toISOString();
  return nextIds.map(
    (assetId) =>
      byAssetId.get(assetId) ?? {
        linkId: uid(),
        assetId,
        addedAt: now,
        addedBy,
      },
  );
}

export interface EffectiveAssetLink extends AssetLink {
  inherited: boolean;
}

/** A track's own asset links plus its parent song's, deduped by assetId. Inherited
 *  links are flagged so the UI can render them read-only - removing one has to happen
 *  on the song, since there's nothing to remove on the track itself (same class of bug
 *  as an un-removable stage->tag fallback chip). */
export function effectiveAssets(
  ownLinks: AssetLink[] | undefined,
  songLinks: AssetLink[] | undefined,
): EffectiveAssetLink[] {
  const ownIds = new Set((ownLinks ?? []).map((l) => l.assetId));
  const own = (ownLinks ?? []).map((l) => ({ ...l, inherited: false }));
  const inherited = (songLinks ?? [])
    .filter((l) => !ownIds.has(l.assetId))
    .map((l) => ({ ...l, inherited: true }));
  return [...own, ...inherited];
}

/** Maps assetId -> a human label of where else it's already linked ("Track Group", "Track: Magical"),
 *  for surfacing a "already associated" hint in AssetPicker dropdowns. */
export function assetLocationMap(
  groupAssets: AssetLink[] | undefined,
  tracks: { title: string; assets?: AssetLink[] }[],
): Map<string, string> {
  const locations = new Map<string, string[]>();
  const add = (assetId: string, label: string) =>
    locations.set(assetId, [...(locations.get(assetId) ?? []), label]);
  for (const link of groupAssets ?? []) add(link.assetId, "Track Group");
  for (const t of tracks)
    for (const link of t.assets ?? [])
      add(link.assetId, `Track: ${t.title || "untitled"}`);
  return new Map(
    [...locations].map(([assetId, labels]) => [assetId, labels.join(", ")]),
  );
}
