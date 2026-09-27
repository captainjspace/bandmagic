import type { TrackStage } from "@/types";

export const STAGES: TrackStage[] = [
  "ideation",
  "writing",
  "morphing",
  "tracking",
  "overdubbing",
  "mixing",
  "mastering",
  "scheduled",
  "released",
];

const KNOWN = new Set<string>(STAGES);

export function stageClass(stage?: string): string {
  const normalized = stage?.trim();
  return KNOWN.has(normalized ?? "") ? `stage-${normalized}` : "stage-unknown";
}

export function stageBgClass(stage?: string): string {
  const normalized = stage?.trim();
  return KNOWN.has(normalized ?? "") ? `stage-${normalized}-bg` : "";
}
