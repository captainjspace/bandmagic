import { type NextRequest, NextResponse } from "next/server";
import { config } from "@/lib/config";
import { getSong, updateSong } from "@/lib/firestore";
import { mockSongs } from "@/lib/mock";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (config.useMock) {
    const song = mockSongs.find((s) => s.id === id);
    if (!song)
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(song);
  }
  const song = await getSong(id);
  if (!song) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(song);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { name, aliases, folderPrefix, latestPath, tags } = await req.json();

  if (name !== undefined && (typeof name !== "string" || !name.trim())) {
    return NextResponse.json(
      { error: '"name" must be a non-empty string' },
      { status: 400 },
    );
  }
  if (
    aliases !== undefined &&
    (!Array.isArray(aliases) || !aliases.every((a) => typeof a === "string"))
  ) {
    return NextResponse.json(
      { error: '"aliases" must be an array of strings' },
      { status: 400 },
    );
  }
  if (folderPrefix !== undefined && typeof folderPrefix !== "string") {
    return NextResponse.json(
      { error: '"folderPrefix" must be a string' },
      { status: 400 },
    );
  }
  if (latestPath !== undefined && typeof latestPath !== "string") {
    return NextResponse.json(
      { error: '"latestPath" must be a string' },
      { status: 400 },
    );
  }
  if (
    tags !== undefined &&
    (!Array.isArray(tags) || !tags.every((t) => typeof t === "string"))
  ) {
    return NextResponse.json(
      { error: '"tags" must be an array of strings' },
      { status: 400 },
    );
  }

  const author =
    req.headers
      .get("x-goog-authenticated-user-email")
      ?.replace("accounts.google.com:", "") ??
    process.env.LOCAL_USER_EMAIL ??
    "unknown";

  const patch = {
    ...(name !== undefined ? { name: name.trim() } : {}),
    ...(aliases !== undefined ? { aliases } : {}),
    ...(folderPrefix !== undefined ? { folderPrefix } : {}),
    ...(latestPath !== undefined ? { latestPath } : {}),
    ...(tags !== undefined ? { tags } : {}),
  };

  if (config.useMock) {
    return NextResponse.json({ id, ...patch });
  }

  await updateSong(id, patch, author);
  const song = await getSong(id);
  if (!song) {
    return NextResponse.json({ error: "Song not found" }, { status: 404 });
  }
  return NextResponse.json(song);
}
