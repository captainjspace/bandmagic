/** Compact "which song owns this track" chip — used on the track-group detail
 *  page, where tracks from different songs sit side by side. */
export function SongChip({
  name,
  size = "md",
  title,
}: {
  name: string;
  size?: "sm" | "md" | "lg";
  title?: string;
}) {
  const sizeClass =
    size === "lg"
      ? "text-sm px-2.5 py-1 gap-1.5"
      : size === "sm"
        ? "text-[10px] px-1 py-0.5 gap-0.5"
        : "text-xs px-1.5 py-0.5 gap-1";
  return (
    <span
      title={title}
      className={`inline-flex items-center rounded border border-rbyellow-800 bg-rbyellow-950/20 shrink-0 max-w-full ${sizeClass}`}
    >
      <span aria-hidden className="text-rbyellow-500">
        ♪
      </span>
      <span className="text-gradient-brand font-semibold truncate">{name}</span>
    </span>
  );
}
