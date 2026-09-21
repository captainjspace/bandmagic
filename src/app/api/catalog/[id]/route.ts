import { type NextRequest, NextResponse } from "next/server";
import { config } from "@/lib/config";
import { getSong, updateCatalogEntry } from "@/lib/firestore";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { songId } = await req.json();
  if (typeof songId !== "string" || !songId) {
    return NextResponse.json(
      { error: 'Missing "songId" body' },
      { status: 400 },
    );
  }

  if (config.useMock) {
    return NextResponse.json({ id, songId });
  }

  const song = await getSong(songId);
  if (!song) {
    return NextResponse.json({ error: "Song not found" }, { status: 404 });
  }

  const entry = await updateCatalogEntry(id, { songId });
  return NextResponse.json(entry);
}
