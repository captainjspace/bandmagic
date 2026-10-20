export const dynamic = "force-dynamic";

import Link from "next/link";
import { EntityFlag } from "@/components/EntityFlag";
import {
  SEARCH_KIND_LABEL,
  SEARCH_KINDS,
  type SearchResult,
  searchEntities,
} from "@/lib/search";
import { loadSearchSources } from "@/lib/search-sources";

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
  const results = q ? searchEntities(q, await loadSearchSources()) : [];
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
            : "Type in the search box above and press Enter."}
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
