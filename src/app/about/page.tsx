import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/sections/page-header";
import { PceLogo } from "@/components/ui/logos";
import { VerticalIcon } from "@/components/ui/vertical-icon";
import { site } from "@/data/site";
import { verticals } from "@/data/verticals";

export const metadata: Metadata = {
  title: "About",
  alternates: { canonical: "/about" },
};

/**
 * About (docs/ux/page-structures.md): confirmed facts only. Longer history/vision copy
 * needs official text (Phase 1).
 */
export default function AboutPage() {
  return (
    <>
      <PageHeader title="About Ashwamedh" />
      <div data-vertical="brand" className="container-site max-w-4xl pb-16 lg:pb-24">
        <p className="type-body-lg text-fg-secondary">{site.description}</p>

        <h2 className="mt-12 type-h2 text-fg">Four verticals</h2>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {verticals.map((v) => (
            <li key={v.id} data-vertical={v.id}>
              <Link
                href={v.href}
                className="group flex min-h-16 items-center gap-4 rounded-lg border border-line bg-surface px-5 transition-colors hover:border-accent/55"
              >
                <span className="flex size-10 items-center justify-center rounded-sm bg-accent/12">
                  <VerticalIcon name={v.icon} className="size-5 text-accent" />
                </span>
                <span className="flex-1 type-title text-fg">{v.name}</span>
                <ArrowRight
                  aria-hidden
                  className="size-4 text-accent transition-transform group-hover:translate-x-1"
                />
              </Link>
            </li>
          ))}
        </ul>

        <h2 className="mt-12 type-h2 text-fg">The college</h2>
        <div className="mt-6 flex items-center gap-5 rounded-lg border border-line bg-surface p-5">
          <PceLogo height={56} />
          <p className="type-body text-fg-secondary">
            <span className="font-semibold text-fg">{site.college}</span>
            <br />
            {site.city}
          </p>
        </div>
      </div>
    </>
  );
}
