import type { ReactNode } from "react";

/**
 * Display title flanked by thin decorative arrows (reference panels 03, 06).
 * `as` keeps the semantic level independent of the visual style.
 */
export function SectionHeading({
  as: Tag = "h2",
  eyebrow,
  children,
  status,
  id,
  tone = "accent",
}: {
  as?: "h1" | "h2";
  eyebrow?: ReactNode;
  children: ReactNode;
  status?: ReactNode;
  id?: string;
  tone?: "accent" | "plain";
}) {
  return (
    <div className="flex flex-col items-center text-center">
      {eyebrow}
      <div className="flex items-center gap-4 sm:gap-6">
        <span aria-hidden className="hidden h-px w-10 bg-line-strong sm:block md:w-16" />
        <Tag
          id={id}
          className={`type-display ${tone === "accent" ? "text-accent" : "text-fg"} [text-wrap:balance]`}
        >
          {children}
        </Tag>
        <span aria-hidden className="hidden h-px w-10 bg-line-strong sm:block md:w-16" />
      </div>
      {status && <p className="mt-4 type-label text-fg-muted">{status}</p>}
    </div>
  );
}
