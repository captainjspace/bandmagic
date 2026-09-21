import { type NextRequest, NextResponse } from "next/server";
import { uid } from "@/lib/asset";
import { config } from "@/lib/config";
import { errorResponse, isDebugUser } from "@/lib/debug-mode";
import { type DriveFile, searchFiles } from "@/lib/drive";
import {
  inferSubtype,
  SWEEP_THRESHOLD,
  scoreMatch,
} from "@/lib/filename-match";
import {
  createAsset,
  getAssets,
  getTrackGroup,
  updateTrackGroup,
} from "@/lib/firestore";
import { mockDriveFiles } from "@/lib/mock";
import type { AssetLink, Track } from "@/types";

type SweepError = { trackPath: string; trackTitle: string; reason: string };
type SweepResponse = {
  proposed: number;
  created: number;
  attached: number;
  errors: SweepError[];
};

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { trackGroupId?: string };
  const trackGroupId = body.trackGroupId?.trim();
  if (!trackGroupId)
    return NextResponse.json(
      { error: "trackGroupId required" },
      { status: 400 },
    );

  const userEmail =
    req.headers
      .get("x-goog-authenticated-user-email")
      ?.replace("accounts.google.com:", "") ??
    process.env.LOCAL_USER_EMAIL ??
    "";

  if (config.useMock) {
    return NextResponse.json(mockSweep());
  }

  const debug = isDebugUser(userEmail);

  let trackGroup: Awaited<ReturnType<typeof getTrackGroup>>;
  let existingAssets: Awaited<ReturnType<typeof getAssets>>;
  try {
    trackGroup = await getTrackGroup(trackGroupId);
    if (!trackGroup)
      return NextResponse.json(
        { error: "TrackGroup not found" },
        { status: 404 },
      );
    existingAssets = await getAssets();
  } catch (e) {
    const { body, status } = errorResponse(e, {
      userEmail,
      fallback: "Sweep prep failed.",
      logTag: "sweep-drive/prep",
    });
    return NextResponse.json(body, { status });
  }

  const assetByUrl = new Map(existingAssets.map((a) => [normUrl(a.url), a]));

  const errors: SweepError[] = [];
  let proposed = 0;
  let created = 0;
  let attached = 0;
  let trackGroupChanged = false;

  const newTracks: Track[] = [];
  for (const track of trackGroup.tracks) {
    if (!track.title.trim()) {
      newTracks.push(track);
      continue;
    }

    let driveResults: DriveFile[] = [];
    try {
      driveResults = await searchFiles({
        userEmail,
        q: track.title,
        folderId: config.driveFolderId || undefined,
      });
    } catch (e) {
      console.error("[sweep-drive/search]", track.title, e);
      errors.push({
        trackPath: track.path,
        trackTitle: track.title,
        reason: debug && e instanceof Error ? e.message : "Drive search failed",
      });
      newTracks.push(track);
      continue;
    }

    const matches = driveResults
      .map((f) => ({ file: f, score: scoreMatch(f.name, track.title) }))
      .filter((m) => m.score >= SWEEP_THRESHOLD)
      .sort((a, b) => b.score - a.score);

    if (matches.length === 0) {
      newTracks.push(track);
      continue;
    }
    proposed += matches.length;

    const links = new Map((track.assets ?? []).map((l) => [l.assetId, l]));
    const startCount = links.size;

    for (const { file } of matches) {
      const key = normUrl(file.webViewLink);
      let asset = assetByUrl.get(key);
      if (!asset) {
        try {
          asset = await createAsset({
            url: file.webViewLink,
            title: file.name,
            type: "drive",
            subtype: inferSubtype(file.name),
            createdBy: userEmail || "sweep",
            updatedBy: userEmail || "sweep",
          });
          assetByUrl.set(key, asset);
          created++;
        } catch (e) {
          console.error("[sweep-drive/createAsset]", file.name, e);
          errors.push({
            trackPath: track.path,
            trackTitle: track.title,
            reason:
              debug && e instanceof Error ? e.message : "Asset create failed",
          });
          continue;
        }
      }
      if (!links.has(asset.id)) {
        const link: AssetLink = {
          linkId: uid(),
          assetId: asset.id,
          addedAt: new Date().toISOString(),
          addedBy: userEmail || "sweep",
        };
        links.set(asset.id, link);
      }
    }

    if (links.size > startCount) {
      attached += links.size - startCount;
      newTracks.push({ ...track, assets: [...links.values()] });
      trackGroupChanged = true;
    } else {
      newTracks.push(track);
    }
  }

  if (trackGroupChanged) {
    try {
      await updateTrackGroup(trackGroupId, { tracks: newTracks });
    } catch (e) {
      console.error("[sweep-drive/updateTrackGroup]", e);
      errors.push({
        trackPath: "",
        trackTitle: "(trackGroup save)",
        reason:
          debug && e instanceof Error ? e.message : "TrackGroup update failed",
      });
    }
  }

  const response: SweepResponse = { proposed, created, attached, errors };
  return NextResponse.json(response);
}

function normUrl(url: string): string {
  return url.replace(/[?#].*$/, "").toLowerCase();
}

function mockSweep(): SweepResponse {
  return {
    proposed: mockDriveFiles.length,
    created: 0,
    attached: 0,
    errors: [
      {
        trackPath: "",
        trackTitle: "(mock)",
        reason: "Mock mode — no Firestore changes",
      },
    ],
  };
}
