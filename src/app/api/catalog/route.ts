import { type NextRequest, NextResponse } from "next/server";
import { config } from "@/lib/config";
import { errorResponse } from "@/lib/debug-mode";
import { getCatalog, getSong, syncCatalog, updateSong } from "@/lib/firestore";
import { isAudio, uploadObject } from "@/lib/gcs";
import { mockCatalog } from "@/lib/mock";
import type { CatalogEntry } from "@/types";

const MAX_UPLOAD_BYTES = 32 * 1024 * 1024;

export async function GET() {
  if (config.useMock) return NextResponse.json(mockCatalog);
  const entries = await getCatalog();
  return NextResponse.json(entries);
}

export async function POST(req: NextRequest) {
  const userEmail =
    req.headers
      .get("x-goog-authenticated-user-email")
      ?.replace("accounts.google.com:", "") ??
    process.env.LOCAL_USER_EMAIL ??
    "unknown";

  const form = await req.formData();
  const file = form.get("file");
  const songId = form.get("songId");
  const stage = form.get("stage");
  const title = form.get("title");

  if (!(file instanceof File) || !file.name) {
    return NextResponse.json({ error: 'Missing "file"' }, { status: 400 });
  }
  if (typeof songId !== "string" || !songId) {
    return NextResponse.json({ error: 'Missing "songId"' }, { status: 400 });
  }
  if (typeof stage !== "string" || !stage) {
    return NextResponse.json({ error: 'Missing "stage"' }, { status: 400 });
  }
  if (!isAudio(file.name)) {
    return NextResponse.json(
      { error: "Unsupported file type" },
      { status: 400 },
    );
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: "File exceeds the 32MB upload limit" },
      { status: 413 },
    );
  }

  if (config.useMock) {
    const path = `${config.prefix}${file.name}`;
    return NextResponse.json(
      {
        id: encodeURIComponent(path),
        path,
        song: file.name,
        songId,
        stage,
        mix: file.name.replace(/\.[^.]+$/, ""),
        title: typeof title === "string" && title ? title : file.name,
        size: file.size,
      } satisfies CatalogEntry,
      { status: 201 },
    );
  }

  try {
    const song = await getSong(songId);
    if (!song) {
      return NextResponse.json({ error: "Song not found" }, { status: 404 });
    }

    let folderPrefix = song.folderPrefix;
    if (!folderPrefix) {
      folderPrefix = `${config.prefix}${song.name}/`;
      await updateSong(song.id, { folderPrefix }, userEmail);
    }

    const path = `${folderPrefix}${file.name}`;
    const mix = file.name.replace(/\.[^.]+$/, "");
    const entry: Omit<CatalogEntry, "id"> = {
      path,
      song: song.name,
      songId: song.id,
      stage,
      mix,
      title: typeof title === "string" && title.trim() ? title.trim() : mix,
      size: file.size,
    };

    await uploadObject(
      path,
      Buffer.from(await file.arrayBuffer()),
      file.type || undefined,
    );
    await syncCatalog([entry]);

    return NextResponse.json(
      { id: encodeURIComponent(path), ...entry },
      { status: 201 },
    );
  } catch (e) {
    const { body, status } = errorResponse(e, {
      userEmail,
      fallback: "Upload failed.",
      logTag: "catalog/upload",
    });
    return NextResponse.json(body, { status });
  }
}
