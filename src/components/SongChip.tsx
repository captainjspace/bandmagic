/** The one place "how a song reference looks" is defined — a bordered chip
 *  with a gradient name, from the Browse page's song header (size "xl") down
 *  to the small inline reference on the track-group detail page ("sm"). */
export function SongChip({
  name,
  size = "md",
  title,
}: {
  name: string;
  size?: "sm" | "md" | "lg" | "xl";
  title?: string;
}) {
  const sizeClass =
    size === "xl"
      ? "text-lg px-3 py-1.5 gap-2"
      : size === "lg"
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
