import { Fragment } from "react";
import { PceLogo } from "@/components/ui/logos";
import { site } from "@/data/site";

/**
 * PCE logo (on its light plate, DS-04) + college name — every placement in one place.
 * - `navbar`: homepage hero navbar. Logo 36 → 40 px from xl; name hidden below sm.
 *   The logo is decorative here (alt=""): the enclosing home link carries the accessible name.
 * - `menu`: mobile menu footer, full college name on one line.
 * - `footer`: footer brand block, stacked abbreviated name + city.
 * - `about`: About page, full name + city in body type.
 * `className` is for placement only (alignment, card chrome).
 */
export function CollegeLockup({
  variant,
  className = "",
}: {
  variant: "navbar" | "menu" | "footer" | "about";
  className?: string;
}) {
  switch (variant) {
    case "navbar":
      return (
        <span className={`flex items-center gap-3 ${className}`}>
          <span className="flex xl:hidden">
            <PceLogo height={36} alt="" eager />
          </span>
          <span className="hidden xl:flex">
            <PceLogo height={40} alt="" eager />
          </span>
          <span className="hidden flex-col type-micro leading-snug tracking-[0.08em] whitespace-nowrap text-fg sm:flex">
            <span>{site.collegeLockup.join(" ")}</span>
            <span className="text-fg-secondary">{site.city}</span>
          </span>
        </span>
      );

    case "menu":
      return (
        <div className={`flex items-center gap-3 ${className}`}>
          <PceLogo height={36} />
          <span className="type-micro leading-snug tracking-[0.08em] text-fg-secondary">
            {site.college}, {site.city}
          </span>
        </div>
      );

    case "footer":
      return (
        <div className={`flex items-center gap-3 ${className}`}>
          <PceLogo height={44} />
          <p className="type-micro leading-snug tracking-[0.08em] text-fg-secondary">
            {site.collegeLockup.map((line) => (
              <Fragment key={line}>
                {line}
                <br />
              </Fragment>
            ))}
            <span className="text-fg-muted">{site.city}</span>
          </p>
        </div>
      );

    case "about":
      return (
        <div className={`flex items-center gap-5 ${className}`}>
          <PceLogo height={56} />
          <p className="type-body text-fg-secondary">
            <span className="font-semibold text-fg">{site.college}</span>
            <br />
            {site.city}
          </p>
        </div>
      );
  }
}
