import taxonomy from "../../tags.json";

interface TagDef {
  color?: string;
}

interface EntitySection {
  tags?: Record<string, TagDef>;
}

const TAXONOMY = taxonomy as unknown as Record<string, EntitySection>;

/** Entity type must match a top-level key in tags.json (e.g. "track", "song"). */
export function tagClass(tag: string, entityType: string): string {
  const color = TAXONOMY[entityType]?.tags?.[tag.trim()]?.color;
  return color ? `tag-${color}` : "tag-default";
}

export function tagBgClass(tag: string, entityType: string): string {
  const color = TAXONOMY[entityType]?.tags?.[tag.trim()]?.color;
  return color ? `tag-${color}-bg` : "";
}

/**
 * tags is new on embedded Track/CatalogEntry records; pre-existing rows only
 * have the old scalar "stage" field populated. Falls back to showing the
 * legacy stage as a single-item tag list so existing data stays visible
 * until it's migrated to a real tag. Never returns the literal "unknown".
 */
export function effectiveTags(tags?: string[], stage?: string): string[] {
  if (tags && tags.length > 0) return tags;
  if (stage && stage !== "unknown") return [stage];
  return [];
}
