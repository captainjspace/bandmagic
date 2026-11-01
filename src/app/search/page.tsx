export const dynamic = "force-dynamic";

import Link from "next/link";
import { EntityFlag } from "@/components/EntityFlag";
import { SaveAsTrackGroup } from "@/components/SaveAsTrackGroup";
import {
  entitiesByTag,
  SEARCH_KIND_LABEL,
  SEARCH_KINDS,
  type SearchResult,
  searchEntities,
  type TaggedTrack,
  tagQuery,
  tracksByTag,
} from "@/lib/search";
import { loadCatalog, loadSearchSources } from "@/lib/search-sources";
import { tagBgClass, tagClass } from "@/lib/tag";

function TaggedTracks({ tag, tracks }: { tag: string; tracks: TaggedTrack[] }) {
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="rb-label">
          Tracks tagged “{tag}” ({tracks.length})
        </h2>
        <SaveAsTrackGroup tag={tag} tracks={tracks} />
      </div>
      <ul className="space-y-1">
        {tracks.map((t) => (
          <li key={t.path} className="rb-task">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-rbcyan-100">{t.title}</p>
              <p className="tg-meta truncate font-mono">{t.path}</p>
            </div>
            <span className="flex flex-wrap justify-end gap-1">
              {t.tags.map((x) => (
                <span
                  key={x}
                  className={`tg-chip ${tagClass(x, "track")} ${tagBgClass(x, "track")}`}
                >
                  {x}
                </span>
              ))}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ResultCard({ r }: { r: SearchResult }) {
  const className = `rb-result-card entity-border-${r.kind}`;
  const body = (
    <>
      <EntityFlag kind={r.kind} />
      <span className="truncate font-semibold text-neutral-100">
        {r.title}
        {r.external && <span aria-hidden> ↗</span>}
      </span>
      {r.subtitle && (
        <span className="line-clamp-2 text-xs text-neutral-400">
          {r.subtitle}
        </span>
      )}
    </>
  );
  return r.external ? (
    <a
      href={r.href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
    >
      {body}
    </a>
  ) : (
    <Link href={r.href} className={className}>
      {body}
    </Link>
  );
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const raw = (await searchParams).q;
  const q = (Array.isArray(raw) ? raw[0] : raw)?.trim() ?? "";
  const tag = tagQuery(q);
  const sources = q ? await loadSearchSources() : null;
  const results = !sources
    ? []
    : tag
      ? entitiesByTag(tag, sources)
      : searchEntities(q, sources);
  // Plain queries check tags too — "#" only narrows the entity results to tags.
  const tagTerm = tag ?? q;
  const tagged = sources
    ? tracksByTag(tagTerm, { ...sources, catalog: await loadCatalog() })
    : [];
  const counts = SEARCH_KINDS.map((kind) => ({
    kind,
    n: results.filter((r) => r.kind === kind).length,
  })).filter((c) => c.n > 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-bold tracking-tight">Search</h1>
        <p className="mt-1 text-sm text-rbcyan-300">
          {q
            ? `${results.length} result${results.length === 1 ? "" : "s"} for “${q}”`
            : "Type in the search box above and press Enter. Start with # to search only by tag (e.g. #overdubbing)."}
        </p>
        {counts.length > 0 && (
          <p className="mt-2 flex flex-wrap gap-3 text-xs text-neutral-400">
            {counts.map((c) => (
              <span key={c.kind}>
                {SEARCH_KIND_LABEL[c.kind]}: {c.n}
              </span>
            ))}
          </p>
        )}
      </div>
      {(tag || tagged.length > 0) && (
        <TaggedTracks tag={tagTerm} tracks={tagged} />
      )}
      {results.length > 0 && (
        <div className="rb-result-grid">
          {results.map((r) => (
            <ResultCard key={`${r.kind}-${r.id}`} r={r} />
          ))}
        </div>
      )}
    </div>
  );
}
