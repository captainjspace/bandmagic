/** The one place "how a track reference looks" is defined — a bordered
 *  cyan chip around the filename, sized/shaped to match SongChip so the two
 *  entity chips read as one family (see SongChip.tsx). */
export function TrackChip({
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
      ? "text-lg px-3 py-1.5"
      : size === "lg"
        ? "text-sm px-2.5 py-1"
        : size === "sm"
          ? "text-[10px] px-1 py-0.5"
          : "text-xs px-1.5 py-0.5";
  return (
    <span
      title={title}
      className={`inline-flex max-w-full shrink-0 items-center rounded border border-cyan-800 bg-cyan-950/20 font-mono text-cyan-400 ${sizeClass}`}
    >
      <span className="truncate">{name}</span>
    </span>
  );
}
