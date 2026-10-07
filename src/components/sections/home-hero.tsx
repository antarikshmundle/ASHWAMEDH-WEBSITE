import { ArrowDown, ArrowRight } from "lucide-react";
import { HeroBackdrop } from "@/components/art/hero-backdrop";
import { CopyPlaceholder } from "@/components/ui/copy-placeholder";
import { AshwamedhLogo } from "@/components/ui/logos";
import { site } from "@/data/site";
import { verticals } from "@/data/verticals";
import { HERO_LOGO_ID } from "@/lib/constants";

/**
 * Homepage H1 — cinematic hero (reference panel 01, docs/ux/homepage.md).
 * - Logo area reserves the reference size; the current asset renders within its
 *   native-sharpness limit (DS-06) until the official high-res logo arrives.
 * - "Coming Soon →" is a non-interactive status (OD-12). "Scroll to explore" works.
 */
export function HomeHero() {
  return (
    <section
      data-vertical="brand"
      aria-labelledby="hero-title"
      className="relative isolate flex min-h-[max(560px,100svh)] flex-col overflow-hidden lg:min-h-[max(720px,100svh)]"
    >
      <HeroBackdrop />

      <div className="relative container-site flex flex-1 flex-col items-center justify-center pt-24 pb-8 lg:pt-28">
        {/* Left word stack — decorative echo of the verticals (hidden < md, DS-08) */}
        <ul
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-6 hidden -translate-y-1/2 -skew-y-6 enter-fade flex-col gap-2 [animation-delay:480ms] md:flex xl:left-10"
        >
          {verticals.map((v, i) => (
            <li
              key={v.id}
              className="type-h3 text-fg-secondary/40 italic"
              style={{ paddingLeft: i * 12 }}
            >
              {v.shortName}
            </li>
          ))}
        </ul>

        {/* Right word stack — OD-07 placeholder copy area (hidden < md) */}
        <div className="pointer-events-none absolute top-1/2 right-6 hidden w-36 -translate-y-1/2 enter-fade flex-col gap-6 [animation-delay:480ms] md:flex xl:right-10 xl:w-44">
          {[72, 60, 100, 82].map((w) => (
            <CopyPlaceholder key={w} lines={1} className="w-full" widths={[w]} />
          ))}
        </div>

        <h1 id="hero-title" className="flex flex-col items-center">
          {/* Reserved final logo space (reference ≈ 45 % of hero width, max 640 px) */}
          <span
            id={HERO_LOGO_ID}
            className="flex aspect-[406/197] w-[min(78vw,640px)] enter-rise items-center justify-center"
          >
            <AshwamedhLogo width={203} alt={site.name} eager />
          </span>
          <span className="sr-only">
            {site.college}, {site.city}
          </span>
        </h1>

        <p className="mt-2 enter-rise type-label-lg text-fg [animation-delay:120ms]">
          {site.festLine}
        </p>

        {/* OD-07: tagline area kept, reference text not used */}
        <CopyPlaceholder
          lines={1}
          align="center"
          className="mt-6 w-[min(70vw,420px)] enter-rise [animation-delay:240ms]"
        />

        {/* OD-12: status — not a link, not focusable */}
        <p className="mt-8 inline-flex h-14 w-full max-w-80 enter-rise cursor-default items-center justify-center gap-3 rounded-md border border-accent type-button-hero text-fg glow-sm [animation-delay:360ms]">
          Coming Soon
          <ArrowRight aria-hidden className="size-5" />
        </p>
      </div>

      <div className="relative flex enter-fade justify-center pb-8 [animation-delay:480ms]">
        <a
          href="#explore"
          className="group flex min-h-11 flex-col items-center gap-2 rounded-md px-3 py-1 type-micro text-fg-secondary hover:text-fg"
        >
          <span className="flex size-10 items-center justify-center rounded-full border border-line-control transition-transform duration-150 group-hover:translate-y-0.5">
            <ArrowDown aria-hidden className="size-4" />
          </span>
          Scroll to explore
        </a>
      </div>
    </section>
  );
}
