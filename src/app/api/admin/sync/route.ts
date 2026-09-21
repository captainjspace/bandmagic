import { type NextRequest, NextResponse } from "next/server";
import { config } from "@/lib/config";
import { getSongs, matchSong, syncCatalog, updateSong } from "@/lib/firestore";
import { isAudio, listObjects, stageFromPath, titleFromPath } from "@/lib/gcs";

export async function POST(req: NextRequest) {
  if (config.useMock)
    return NextResponse.json({ synced: 0, message: "mock mode" });

  const actor =
    req.headers
      .get("x-goog-authenticated-user-email")
      ?.replace("accounts.google.com:", "") ??
    process.env.LOCAL_USER_EMAIL ??
    "unknown";

  const objects = await listObjects(config.prefix);
  const audio = objects.filter((o) => isAudio(o.name));
  const songs = await getSongs();
  const folderPrefixUpdates = new Map<string, string>();

  const entries = audio.map((o) => {
    const parts = o.name.split("/");
    const filename = parts[parts.length - 1];
    const mix = filename.replace(/\.[^.]+$/, "");
    const stage = stageFromPath(o.name) ?? "unknown";
    // song is the folder directly containing the file, or filename if flat
    const isFolderName = parts.length >= 3;
    const song = isFolderName ? parts[parts.length - 2] : mix;
    const title = titleFromPath(o.name);

    // Prefer a match on the folder segment (a deliberate per-song folder); fall back to the
    // filename itself, which also covers catch-all folders (e.g. "Archive") that aren't
    // song-named but still hold individually-titled files.
    const folderMatch = isFolderName ? matchSong(songs, song) : undefined;
    const matched = folderMatch ?? matchSong(songs, filename);
    if (folderMatch && !folderMatch.folderPrefix) {
      folderPrefixUpdates.set(
        folderMatch.id,
        `${parts.slice(0, -1).join("/")}/`,
      );
    }

    return {
      path: o.name,
      song,
      ...(matched ? { songId: matched.id } : {}),
      stage,
      mix,
      title,
      size: Number(o.size),
    };
  });

  await Promise.all(
    Array.from(folderPrefixUpdates, ([id, folderPrefix]) =>
      updateSong(id, { folderPrefix }, actor),
    ),
  );

  const synced = await syncCatalog(entries);
  return NextResponse.json({ synced, message: `${synced} tracks indexed` });
}
