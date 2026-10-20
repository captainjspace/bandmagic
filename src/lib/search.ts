import { normalize } from "@/lib/filename-match";
import type { Asset, Song, TrackGroup } from "@/types";

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

/** Pure search over already-loaded entities, best match first. */
export function searchEntities(
  q: string,
  { trackGroups, songs, assets }: SearchSources,
  limit = 50,
): SearchResult[] {
  const results: SearchResult[] = [
    ...trackGroups.map((tg) => ({
      kind: "track-group" as const,
      id: tg.id,
      title: tg.title,
      subtitle: `${tg.tracks.length} track${tg.tracks.length === 1 ? "" : "s"}${tg.description ? ` · ${tg.description}` : ""}`,
      href: `/track-group/${tg.id}`,
      external: false,
      score: scoreFields(
        q,
        [tg.title],
        [tg.description ?? "", ...tg.tracks.map((t) => t.title)],
      ),
    })),
    ...songs.map((s) => ({
      kind: "song" as const,
      id: s.id,
      title: s.name,
      subtitle: s.aliases?.length ? `aka ${s.aliases.join(", ")}` : undefined,
      href: `/browse?editSong=${encodeURIComponent(s.id)}`,
      external: false,
      score: scoreFields(q, [s.name], s.aliases ?? []),
    })),
    ...assets.map((a) => ({
      kind: "asset" as const,
      id: a.id,
      title: a.title,
      subtitle: `${a.subtype} · ${a.type}`,
      href: a.url,
      external: true,
      score: scoreFields(q, [a.title], [a.subtype, ...(a.tags ?? [])]),
    })),
  ];
  return results
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
    .slice(0, limit);
}
