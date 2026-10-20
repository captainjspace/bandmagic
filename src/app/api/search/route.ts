import { type NextRequest, NextResponse } from "next/server";
import { searchEntities } from "@/lib/search";
import { loadSearchSources } from "@/lib/search-sources";

/** GET /api/search?q=&limit= — universal search over track groups, songs,
 *  and assets. Typeahead uses a small limit; the results page uses the default. */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  const limit = Number(req.nextUrl.searchParams.get("limit")) || undefined;
  if (!q) return NextResponse.json([]);
  try {
    return NextResponse.json(
      searchEntities(q, await loadSearchSources(), limit),
    );
  } catch (e) {
    console.error("[search]", e);
    return NextResponse.json({ error: "Search failed." }, { status: 500 });
  }
}
