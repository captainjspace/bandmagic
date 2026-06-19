import type { AssetSubtype } from '@/types';

/** Normalize a filename or track title for comparison: lowercase, strip extension, collapse whitespace, drop non-alphanumeric runs to single space. */
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/\.[a-z0-9]{1,5}$/i, '')      // strip file extension
    .replace(/[^a-z0-9]+/g, ' ')           // collapse non-alphanumeric → space
    .trim();
}

/** Score how closely a filename matches a track title. Returns 0–1. */
export function scoreMatch(filename: string, trackTitle: string): number {
  const f = normalize(filename);
  const t = normalize(trackTitle);
  if (!f || !t) return 0;
  if (f === t) return 1;
  if (f.includes(t)) return 0.85;
  if (t.includes(f)) return 0.6;
  return 0;
}

/** Threshold above which the sweeper auto-attaches. Manual flow can still attach lower-confidence matches. */
export const SWEEP_THRESHOLD = 0.6;

/** Guess an asset subtype from a filename. Falls back to 'other'. */
export function inferSubtype(filename: string): AssetSubtype {
  const n = normalize(filename);
  if (/\blyrics?\b/.test(n)) {
    if (/\b(stripped|clean|distrokid|distro)\b/.test(n)) return 'lyrics-stripped';
    return 'lyrics';
  }
  if (/\b(chord|chart)s?\b/.test(n)) return 'chord-chart';
  if (/\b(press|announce|announcement)\b/.test(n)) return 'press-release';
  if (/\breviews?\b/.test(n)) return 'review';
  if (/\bposts?\b/.test(n)) return 'post';
  return 'other';
}
