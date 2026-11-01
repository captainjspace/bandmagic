import { type NextRequest, NextResponse } from "next/server";
import { config } from "@/lib/config";
import { setTrackGroupRating } from "@/lib/firestore";
import { userEmail } from "@/lib/identity";

/** PUT { rating } — sets the caller's own rating; 0 clears it. */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const email = userEmail(req.headers);
  const rating = Math.round(Number((await req.json()).rating));
  if (!email)
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  if (!Number.isFinite(rating) || rating < 0)
    return NextResponse.json({ error: "Bad rating." }, { status: 400 });
  if (config.useMock)
    return NextResponse.json({ id, ratings: { [email]: rating } });
  return NextResponse.json(await setTrackGroupRating(id, email, rating));
}
