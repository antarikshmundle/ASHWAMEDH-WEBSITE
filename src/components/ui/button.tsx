import Link from "next/link";
import { ArrowRight, Clock, ExternalLink } from "lucide-react";
import type { ReactNode } from "react";

/**
 * CTA variants (docs/design-system/components.md → Buttons and CTA states).
 * Primary/Secondary/Tertiary are interactive. Status and Disabled are non-interactive
 * elements with visible text: not focusable, no hover/press (OD-12).
 */

const base =
  "inline-flex min-h-11 items-center justify-center gap-2.5 rounded-md px-6 type-button transition-[background-color,border-color,box-shadow,transform] duration-150 ease-[var(--ease-standard)]";

const primary = `${base} h-12 bg-accent-strong text-on-accent hover:bg-accent hover:glow-sm active:scale-[0.98]`;

export function PrimaryLink({
  href,
  children,
  external = false,
}: {
  href: string;
  children: ReactNode;
  external?: boolean;
}) {
  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={primary}>
        {children}
        <ExternalLink aria-hidden className="size-[18px]" />
        <span className="sr-only">(opens in new tab)</span>
      </a>
    );
  }
  return (
    <Link href={href} className={primary}>
      {children}
      <ArrowRight aria-hidden className="size-[18px]" />
    </Link>
  );
}

/** Primary action that is not navigation (e.g. "Try again" on the error page). */
export function PrimaryButton({
  children,
  icon,
  onClick,
}: {
  children: ReactNode;
  icon?: ReactNode;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className={primary}>
      {children}
      {icon}
    </button>
  );
}

export function SecondaryLink({
  href,
  children,
  icon,
  external = false,
}: {
  href: string;
  children: ReactNode;
  icon?: ReactNode;
  external?: boolean;
}) {
  const cls = `${base} h-12 border border-line-control text-fg hover:border-accent/55 active:bg-white/8`;
  return (
    <a
      href={href}
      className={cls}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      {children}
      {icon}
      {external && <span className="sr-only">(opens in new tab)</span>}
    </a>
  );
}

/** Tertiary text link with trailing arrow ("Explore Events →", "View Schedule →"). */
export function ArrowLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="group inline-flex min-h-11 items-center gap-2 type-meta text-accent hover:underline hover:underline-offset-4"
    >
      {children}
      <ArrowRight
        aria-hidden
        className="size-4 transition-transform duration-150 group-hover:translate-x-1"
      />
    </Link>
  );
}

/** Disabled CTA: dashed control border, muted text, readable (≥ 6.2:1). */
export function DisabledCta({ children, full = false }: { children: ReactNode; full?: boolean }) {
  return (
    <p
      className={`${base} h-12 cursor-default border border-dashed border-line-control bg-surface-2 text-fg-muted ${full ? "w-full" : ""}`}
    >
      <Clock aria-hidden className="size-[18px]" />
      {children}
    </p>
  );
}
