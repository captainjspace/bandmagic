import { SEARCH_KIND_LABEL, type SearchKind } from "@/lib/search";

/** The entity-type badge on search suggestions and result cards. */
export function EntityFlag({ kind }: { kind: SearchKind }) {
  return (
    <span className={`entity-flag entity-flag-${kind}`}>
      {SEARCH_KIND_LABEL[kind]}
    </span>
  );
}
