import { normalize } from "@/lib/filename-match";
import { effectiveTags } from "@/lib/tag";
import type { Asset, CatalogEntry, Song, TrackGroup } from "@/types";

/** The entity kinds universal search covers — also the key for each
 *  result's `.entity-flag-<kind>` CSS class in globals.css. */
export const SEARCH_KINDS = ["track-group", "song", "asset"] as const;
export type SearchKind = (typeof SEARCH_KINDS)[number];

export const SEARCH_KIND_LABEL: Record<SearchKind, string> = {
  "track-group": "Track Group",
  song: "Song",
  asset: "Asset",
};

export type SearchResult = {
  kind: SearchKind;
  id: string;
  title: string;
  subtitle?: string;
  href: string;
  /** true when `href` leaves the app (asset URLs) */
  external: boolean;
  score: number;
};

export type SearchSources = {
  trackGroups: TrackGroup[];
  songs: Song[];
  assets: Asset[];
};

/** Score `q` against an entity's primary fields (its name) and secondary
 *  fields (description, aliases, track titles…). Case/punctuation-insensitive
 *  per the fuzzy-matching invariant. Returns 0 for no match. */
export function scoreFields(
  q: string,
  primary: string[],
  secondary: string[] = [],
): number {
  const query = normalize(q);
  if (!query) return 0;
  const tokens = query.split(" ");
  const rank = (field: string, weight: number) => {
    const f = normalize(field);
    if (!f) return 0;
    if (f === query) return weight;
    if (f.startsWith(query)) return 0.9 * weight;
    if (f.includes(query)) return 0.8 * weight;
    if (tokens.every((t) => f.includes(t))) return 0.6 * weight;
    // "magicali" should still find "Magi-cali"
    if (f.replaceAll(" ", "").includes(query.replaceAll(" ", "")))
      return 0.5 * weight;
    return 0;
  };
  return Math.max(
    0,
    ...primary.map((f) => rank(f, 1)),
    ...secondary.map((f) => rank(f, 0.5)),
  );
}

type Scorer = (primary: string[], secondary: string[]) => number;

/** One SearchResult per entity, scored by `score`. */
function toResults(
  { trackGroups, songs, assets }: SearchSources,
  score: Scorer,
): SearchResult[] {
  return [
    ...trackGroups.map((tg) => ({
      kind: "track-group" as const,
      id: tg.id,
      title: tg.title,
      subtitle: `${tg.tracks.length} track${tg.tracks.length === 1 ? "" : "s"}${tg.description ? ` · ${tg.description}` : ""}`,
      href: `/track-group/${tg.id}`,
      external: false,
      score: score(
        [tg.title],
        [
          tg.description ?? "",
          ...(tg.tags ?? []),
          ...tg.tracks.flatMap((t) => [
            t.title,
            ...effectiveTags(t.tags, t.stage),
          ]),
        ],
      ),
    })),
    ...songs.map((s) => ({
      kind: "song" as const,
      id: s.id,
      title: s.name,
      subtitle: s.aliases?.length ? `aka ${s.aliases.join(", ")}` : undefined,
      href: `/browse?editSong=${encodeURIComponent(s.id)}`,
      external: false,
      score: score([s.name], [...(s.aliases ?? []), ...(s.tags ?? [])]),
    })),
    ...assets.map((a) => ({
      kind: "asset" as const,
      id: a.id,
      title: a.title,
      subtitle: `${a.subtype} · ${a.type}`,
      href: a.url,
      external: true,
      score: score([a.title], [a.subtype, ...(a.tags ?? [])]),
    })),
  ];
}

/** Pure search over already-loaded entities, best match first. */
export function searchEntities(
  q: string,
  sources: SearchSources,
  limit = 50,
): SearchResult[] {
  return toResults(sources, (p, s) => scoreFields(q, p, s))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
    .slice(0, limit);
}

/** "#overdub" or "tag:overdub" → "overdub"; anything else → null. */
export function tagQuery(q: string): string | null {
  const m = q.trim().match(/^(?:#|tag:)\s*(.+)$/i);
  return m ? m[1].trim() : null;
}

/** Fuzzy, per the matching invariant: "overdub" finds "overdubbing". */
export function tagMatches(tags: string[], tag: string): boolean {
  const want = normalize(tag);
  return !!want && tags.some((t) => normalize(t).includes(want));
}

export type TaggedTrack = { path: string; title: string; tags: string[] };

/** Every audio file carrying `tag` — from the catalog, from tracks inside
 *  track groups, and each tagged song's latest version — deduped by path.
 *  Legacy `stage` counts as a tag here, same as everywhere it's displayed. */
export function tracksByTag(
  tag: string,
  {
    trackGroups,
    songs,
    catalog,
  }: Omit<SearchSources, "assets"> & {
    catalog: CatalogEntry[];
  },
): TaggedTrack[] {
  const byPath = new Map<string, TaggedTrack>();
  const add = (path: string | undefined, title: string, tags: string[]) => {
    if (!path?.trim()) return;
    const hit = byPath.get(path);
    if (hit) hit.tags = [...new Set([...hit.tags, ...tags])];
    else byPath.set(path, { path, title, tags: [...new Set(tags)] });
  };
  for (const e of catalog) {
    const tags = effectiveTags(e.tags, e.stage);
    if (tagMatches(tags, tag)) add(e.path, e.title, tags);
  }
  for (const tg of trackGroups)
    for (const t of tg.tracks) {
      const tags = effectiveTags(t.tags, t.stage);
      if (tagMatches(tags, tag)) add(t.path, t.title, tags);
    }
  for (const s of songs)
    if (tagMatches(s.tags ?? [], tag)) add(s.latestPath, s.name, s.tags ?? []);
  return [...byPath.values()].sort((a, b) => a.title.localeCompare(b.title));
}

/** Track groups, songs and assets whose own tags match. */
export function entitiesByTag(
  tag: string,
  sources: SearchSources,
): SearchResult[] {
  const keep = (tags?: string[]) => tagMatches(tags ?? [], tag);
  return toResults(
    {
      trackGroups: sources.trackGroups.filter((x) => keep(x.tags)),
      songs: sources.songs.filter((x) => keep(x.tags)),
      assets: sources.assets.filter((x) => keep(x.tags)),
    },
    () => 1,
  ).sort((a, b) => a.title.localeCompare(b.title));
}
