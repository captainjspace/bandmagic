import { describe, expect, it } from "vitest";
import type { TrackGroup } from "@/types";
import { bandRating, isActive, sortTrackGroups, starsFor } from "./track-group";

const tg = (id: string, extra: Partial<TrackGroup> = {}): TrackGroup => ({
  id,
  title: id,
  createdAt: "2026-06-01T00:00:00Z",
  createdBy: "a@x",
  tracks: [],
  ...extra,
});

describe("starsFor", () => {
  it("floors to whole stars and caps at 5", () => {
    expect(starsFor(0)).toBe(0);
    expect(starsFor(299)).toBe(2);
    expect(starsFor(301)).toBe(3);
    expect(starsFor(900)).toBe(5);
  });
});

describe("isActive", () => {
  it("defaults to active, honors the flag and activeUntil", () => {
    expect(isActive(tg("a"))).toBe(true);
    expect(isActive(tg("a", { active: false }))).toBe(false);
    expect(isActive(tg("a", { activeUntil: "2026-10-31" }), "2026-10-31")).toBe(
      true,
    );
    expect(isActive(tg("a", { activeUntil: "2026-10-31" }), "2026-11-01")).toBe(
      false,
    );
  });
});

describe("bandRating", () => {
  it("averages only people who rated", () => {
    expect(bandRating(tg("a"))).toBe(0);
    expect(bandRating(tg("a", { ratings: { x: 300, y: 500, z: 0 } }))).toBe(
      400,
    );
  });
});

describe("sortTrackGroups", () => {
  it("active > my rating > newest; tiebreaker ints bubble up", () => {
    const groups = [
      tg("old-unrated", { createdAt: "2026-01-01" }),
      tg("inactive-5", { active: false, ratings: { me: 500 } }),
      tg("new-unrated", { createdAt: "2026-09-01" }),
      tg("five", { ratings: { me: 500 } }),
      tg("five-plus", { ratings: { me: 501 } }),
      tg("expired", { activeUntil: "2026-10-01", createdAt: "2026-01-01" }),
    ];
    expect(
      sortTrackGroups(groups, "me", "2026-11-01").map((g) => g.id),
    ).toEqual([
      "five-plus",
      "five",
      "new-unrated",
      "old-unrated",
      "inactive-5",
      "expired",
    ]);
  });
});
