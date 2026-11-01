import type { TrackGroup } from "@/types";

/** Each displayed star is worth 100; ratings above MAX_STARS * STAR_UNIT only
 *  break ties ("I really like this one — bubble it up"). */
export const STAR_UNIT = 100;
export const MAX_STARS = 5;

export function starsFor(rating = 0): number {
  return Math.min(MAX_STARS, Math.max(0, Math.floor(rating / STAR_UNIT)));
}

export function ratingOf(tg: TrackGroup, email?: string | null): number {
  return (email && tg.ratings?.[email]) || 0;
}

/** Mean over the people who actually rated it (0 if nobody has). */
export function bandRating(tg: TrackGroup): number {
  const values = Object.values(tg.ratings ?? {}).filter((r) => r > 0);
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
}

/** YYYY-MM-DD in local time — matches what an <input type="date"> holds. */
export function today(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function isActive(tg: TrackGroup, on = today()): boolean {
  return tg.active !== false && (!tg.activeUntil || tg.activeUntil >= on);
}

/** Active first, then the viewer's rating, then newest — so the bottom of the
 *  list is inactive, unrated, oldest. */
export function sortTrackGroups(
  groups: TrackGroup[],
  email?: string | null,
  on = today(),
): TrackGroup[] {
  return [...groups].sort(
    (a, b) =>
      Number(isActive(b, on)) - Number(isActive(a, on)) ||
      ratingOf(b, email) - ratingOf(a, email) ||
      b.createdAt.localeCompare(a.createdAt),
  );
}
