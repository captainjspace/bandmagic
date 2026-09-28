/** Song is the rbyellow entity everywhere it's referenced — Browse's song boxes,
 *  and here as a compact "which song owns this track" chip. */
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
      className={`inline-flex items-center rounded border border-rbyellow-800 text-rbyellow-400 bg-rbyellow-950/20 shrink-0 max-w-full ${sizeClass}`}
    >
      <span aria-hidden>♪</span>
      <span className="truncate">{name}</span>
    </span>
  );
}
