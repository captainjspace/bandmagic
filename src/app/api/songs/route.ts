import { type NextRequest, NextResponse } from "next/server";
import { config } from "@/lib/config";
import { getSong, getSongs, seedSongs } from "@/lib/firestore";
import { mockSongs } from "@/lib/mock";

export async function GET() {
  if (config.useMock) return NextResponse.json(mockSongs);
  const songs = await getSongs();
  return NextResponse.json(songs);
}

export async function POST(req: NextRequest) {
  const { name } = await req.json();
  if (typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: 'Missing "name" body' }, { status: 400 });
  }
  const trimmed = name.trim();

  const author =
    req.headers
      .get("x-goog-authenticated-user-email")
      ?.replace("accounts.google.com:", "") ??
    process.env.LOCAL_USER_EMAIL ??
    "unknown";

  if (config.useMock) {
    const now = new Date().toISOString();
    return NextResponse.json(
      {
        id: encodeURIComponent(trimmed),
        name: trimmed,
        createdAt: now,
        createdBy: author,
        updatedAt: now,
        updatedBy: author,
      },
      { status: 201 },
    );
  }

  await seedSongs([{ name: trimmed }], author);
  const song = await getSong(encodeURIComponent(trimmed));
  return NextResponse.json(song, { status: 201 });
}
