import { type NextRequest, NextResponse } from "next/server";
import { config } from "@/lib/config";
import { getCatalogEntry, getSong, updateCatalogEntry } from "@/lib/firestore";
import { mockCatalog } from "@/lib/mock";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (config.useMock) {
    const entry = mockCatalog.find((e) => e.id === id);
    if (!entry)
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(entry);
  }
  const entry = await getCatalogEntry(id);
  if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(entry);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { songId, stage, tags, title, mix, assets } = await req.json();
  const hasSongId = songId !== undefined;
  const hasStage = stage !== undefined;
  const hasTags = tags !== undefined;
  const hasTitle = title !== undefined;
  const hasMix = mix !== undefined;
  const hasAssets = assets !== undefined;

  if (
    !hasSongId &&
    !hasStage &&
    !hasTags &&
    !hasTitle &&
    !hasMix &&
    !hasAssets
  ) {
    return NextResponse.json(
      {
        error:
          'Provide "songId", "stage", "tags", "title", "mix", and/or "assets"',
      },
      { status: 400 },
    );
  }
  if (hasSongId && (typeof songId !== "string" || !songId)) {
    return NextResponse.json(
      { error: '"songId" must be a non-empty string' },
      { status: 400 },
    );
  }
  if (hasStage && (typeof stage !== "string" || !stage)) {
    return NextResponse.json(
      { error: '"stage" must be a non-empty string' },
      { status: 400 },
    );
  }
  if (
    hasTags &&
    (!Array.isArray(tags) || !tags.every((t) => typeof t === "string"))
  ) {
    return NextResponse.json(
      { error: '"tags" must be an array of strings' },
      { status: 400 },
    );
  }
  if (hasTitle && (typeof title !== "string" || !title.trim())) {
    return NextResponse.json(
      { error: '"title" must be a non-empty string' },
      { status: 400 },
    );
  }
  if (hasMix && typeof mix !== "string") {
    return NextResponse.json(
      { error: '"mix" must be a string' },
      { status: 400 },
    );
  }
  if (
    hasAssets &&
    (!Array.isArray(assets) ||
      !assets.every((l) => l && typeof l.assetId === "string"))
  ) {
    return NextResponse.json(
      { error: '"assets" must be an array of asset links' },
      { status: 400 },
    );
  }

  if (config.useMock) {
    return NextResponse.json({ id, songId, stage, tags, title, mix, assets });
  }

  if (hasSongId) {
    const song = await getSong(songId);
    if (!song) {
      return NextResponse.json({ error: "Song not found" }, { status: 404 });
    }
  }

  const entry = await updateCatalogEntry(id, {
    ...(hasSongId ? { songId } : {}),
    ...(hasStage ? { stage } : {}),
    ...(hasTags ? { tags } : {}),
    ...(hasTitle ? { title: title.trim() } : {}),
    ...(hasMix ? { mix } : {}),
    ...(hasAssets ? { assets } : {}),
  });
  return NextResponse.json(entry);
}
