import type { ReactNode } from "react";
import { SectionHeading } from "@/components/ui/section-heading";

/** Standard inner-page header: display title as h1 + optional status line (brand accent). */
export function PageHeader({
  title,
  status,
  tone = "plain",
  children,
}: {
  title: string;
  status?: ReactNode;
  tone?: "accent" | "plain";
  children?: ReactNode;
}) {
  return (
    <header data-vertical="brand" className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(50%_100%_at_50%_0%,color-mix(in_oklab,var(--brand-ember)_9%,transparent),transparent)]"
      />
      <div className="relative container-site pt-14 pb-10 lg:pt-20 lg:pb-14">
        <SectionHeading as="h1" tone={tone} status={status}>
          {title}
        </SectionHeading>
        {children}
      </div>
    </header>
  );
}
