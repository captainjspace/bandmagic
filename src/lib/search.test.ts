import { describe, expect, it } from "vitest";
import { scoreFields, searchEntities } from "@/lib/search";
import type { Asset, Song, TrackGroup } from "@/types";

const song = (id: string, name: string, aliases?: string[]): Song => ({
  id,
  name,
  aliases,
  createdAt: "",
  createdBy: "",
  updatedAt: "",
  updatedBy: "",
});

const sources = {
  trackGroups: [
    {
      id: "tg1",
      title: "Fall Demos",
      createdAt: "",
      createdBy: "",
      tracks: [{ path: "a.mp3", title: "Magi-cali rough" }],
    } satisfies TrackGroup,
  ],
  songs: [song("s1", "Magi-cali", ["Magical"]), song("s2", "Night Angel")],
  assets: [
    {
      id: "a1",
      url: "https://docs.google.com/document/d/x",
      title: "Magi-cali Lyrics",
      type: "drive",
      subtype: "lyrics",
      usageCount: 0,
      createdAt: "",
      createdBy: "",
      updatedAt: "",
      updatedBy: "",
    } satisfies Asset,
  ],
};

describe("scoreFields", () => {
  it("is case- and punctuation-insensitive", () => {
    expect(scoreFields("MAGICALI", ["Magi-cali"])).toBeGreaterThan(0);
    expect(scoreFields("magi cali", ["Magi-cali"])).toBe(1);
  });

  it("ranks exact > prefix > substring > all-tokens", () => {
    const exact = scoreFields("night angel", ["Night Angel"]);
    const prefix = scoreFields("night", ["Night Angel"]);
    const sub = scoreFields("angel", ["Night Angel"]);
    const tokens = scoreFields("angel night", ["Night Angel"]);
    expect(exact).toBeGreaterThan(prefix);
    expect(prefix).toBeGreaterThan(sub);
    expect(sub).toBeGreaterThan(tokens);
    expect(tokens).toBeGreaterThan(0);
  });

  it("weights secondary fields below primary", () => {
    expect(scoreFields("magical", [], ["Magical"])).toBe(0.5);
    expect(scoreFields("magical", ["Magical"])).toBe(1);
  });

  it("returns 0 for an empty query", () => {
    expect(scoreFields("  ", ["anything"])).toBe(0);
  });
});

describe("searchEntities", () => {
  it("returns every entity kind that matches, best first", () => {
    const results = searchEntities("magi-cali", sources);
    expect(results.map((r) => r.kind)).toEqual([
      "song",
      "asset",
      "track-group",
    ]);
    expect(results[0].href).toBe("/browse?editSong=s1");
    expect(results[1].external).toBe(true);
  });

  it("matches song aliases", () => {
    expect(searchEntities("magical", sources)[0].id).toBe("s1");
  });

  it("drops non-matches and respects the limit", () => {
    expect(searchEntities("zzz", sources)).toEqual([]);
    expect(searchEntities("a", sources, 1)).toHaveLength(1);
  });
});
