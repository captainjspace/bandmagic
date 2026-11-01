import { type NextRequest, NextResponse } from "next/server";
import { entitiesByTag, searchEntities, tagQuery } from "@/lib/search";
import { loadSearchSources } from "@/lib/search-sources";

/** GET /api/search?q=&limit= — universal search over track groups, songs,
 *  and assets. `#tag` / `tag:tag` matches on tags instead of names. Typeahead uses a small limit; the results page uses the default. */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  const limit = Number(req.nextUrl.searchParams.get("limit")) || undefined;
  if (!q) return NextResponse.json([]);
  try {
    const sources = await loadSearchSources();
    const tag = tagQuery(q);
    return NextResponse.json(
      tag
        ? entitiesByTag(tag, sources).slice(0, limit)
        : searchEntities(q, sources, limit),
    );
  } catch (e) {
    console.error("[search]", e);
    return NextResponse.json({ error: "Search failed." }, { status: 500 });
  }
}
