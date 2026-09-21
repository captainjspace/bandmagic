import { describe, expect, it } from "vitest";
import { matchSong } from "@/lib/firestore";
import type { Song } from "@/types";

function song(name: string, aliases?: string[]): Song {
  return {
    id: encodeURIComponent(name),
    name,
    aliases,
    createdAt: "2026-01-01T00:00:00Z",
    createdBy: "test",
    updatedAt: "2026-01-01T00:00:00Z",
    updatedBy: "test",
  };
}

// Regression cases from the real catalog this matcher was debugged against
// (song-entity-browse branch): real folder/file names are concatenated or
// abbreviated ("NightAngel", "MagiCali2") rather than spaced like the
// canonical songlist.txt names ("Night Angel", "Magi-cali").
const songs: Song[] = [
  song("Night Angel"),
  song("Magi-cali"),
  song("Tangerine Dreams"),
  song("Fake Purple Tele"),
  song("Come On Strong"),
  song("City Nights"),
  song("Child of the 80s", ["Rainbow Galaxy"]),
];

describe("matchSong", () => {
  it("matches a concatenated folder segment to its spaced canonical name", () => {
    expect(matchSong(songs, "NightAngel")?.name).toBe("Night Angel");
    expect(matchSong(songs, "TangerineDream")?.name).toBe("Tangerine Dreams");
  });

  it("matches hyphenated and concatenated filename variants to the same song", () => {
    expect(matchSong(songs, "Magi-cali")?.name).toBe("Magi-cali");
    expect(matchSong(songs, "MAGICAL")?.name).toBe("Magi-cali");
    expect(matchSong(songs, "MagiCali2")?.name).toBe("Magi-cali");
  });

  it("matches a filename embedded in an unrelated compound name via containment", () => {
    expect(matchSong(songs, "StraightJazzCock-FakePurpleTele")?.name).toBe(
      "Fake Purple Tele",
    );
  });

  it("matches a filename inside a non-song catch-all folder (e.g. Archive/) on the filename alone", () => {
    expect(matchSong(songs, "come-on-strong")?.name).toBe("Come On Strong");
    expect(matchSong(songs, "citynightsJune2001")?.name).toBe("City Nights");
  });

  it("matches an alias", () => {
    expect(matchSong(songs, "Rainbow Galaxy")?.name).toBe("Child of the 80s");
  });

  it("does not match an unrelated filename", () => {
    expect(matchSong(songs, "muffin-man-live")).toBeUndefined();
    expect(matchSong(songs, "genyp1")).toBeUndefined();
  });
});
