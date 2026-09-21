import { describe, expect, it } from "vitest";
import { inferSubtype, normalize, scoreMatch } from "@/lib/filename-match";

describe("normalize", () => {
  it("lowercases, strips the extension, and collapses punctuation to spaces", () => {
    expect(normalize("MagiCali2.mp3")).toBe("magicali2");
    expect(normalize("Night Angel - Mix 2.wav")).toBe("night angel mix 2");
  });

  it("trims leading/trailing whitespace produced by the collapse", () => {
    expect(normalize("__Sexy Locnar__.m4a")).toBe("sexy locnar");
  });
});

describe("scoreMatch", () => {
  it("scores an exact (normalized) match as 1", () => {
    expect(scoreMatch("Fake Purple Tele.mp3", "Fake Purple Tele")).toBe(1);
  });

  it("scores the filename containing the title higher than the reverse", () => {
    expect(
      scoreMatch("some-review-fake-purple-tele.pdf", "Fake Purple Tele"),
    ).toBe(0.85);
    expect(scoreMatch("fake purple", "Fake Purple Tele")).toBe(0.6);
  });

  it("scores unrelated strings as 0", () => {
    expect(scoreMatch("muffin-man-live.m4a", "Fake Purple Tele")).toBe(0);
  });
});

describe("inferSubtype", () => {
  it("recognizes lyrics, distinguishing the stripped variant", () => {
    expect(inferSubtype("Night Angel - lyrics.pdf")).toBe("lyrics");
    expect(inferSubtype("Night Angel - lyrics (stripped).pdf")).toBe(
      "lyrics-stripped",
    );
  });

  it("recognizes chord charts, press releases, reviews, and posts", () => {
    expect(inferSubtype("chord-chart.pdf")).toBe("chord-chart");
    expect(inferSubtype("press-announcement.docx")).toBe("press-release");
    expect(inferSubtype("blog-review.html")).toBe("review");
    expect(inferSubtype("instagram-post.png")).toBe("post");
  });

  it("falls back to other", () => {
    expect(inferSubtype("random-file.pdf")).toBe("other");
  });
});
