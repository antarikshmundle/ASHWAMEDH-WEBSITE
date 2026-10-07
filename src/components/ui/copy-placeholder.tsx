/**
 * Placeholder copy area (OD-07): reserves the space of an unapproved tagline/description
 * with subtle lines. The reference image's marketing text is never shipped.
 * Decorative only — hidden from assistive technology. Width comes from `className`.
 */
export function CopyPlaceholder({
  lines = 1,
  className = "w-full",
  align = "start",
  widths,
}: {
  lines?: number;
  className?: string;
  align?: "start" | "center" | "end";
  /** Optional per-line widths in % (default: full, last line 60 %). */
  widths?: number[];
}) {
  const alignment = { start: "items-start", center: "items-center", end: "items-end" }[align];
  return (
    <span aria-hidden className={`flex flex-col gap-2 ${alignment} ${className}`}>
      {Array.from({ length: lines }, (_, i) => (
        <span
          key={i}
          className="block h-px bg-line-strong"
          style={{ width: `${widths?.[i] ?? (i === lines - 1 && lines > 1 ? 60 : 100)}%` }}
        />
      ))}
    </span>
  );
}
