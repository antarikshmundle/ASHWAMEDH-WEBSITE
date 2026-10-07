import { VerticalCard } from "@/components/cards/vertical-card";
import { CopyPlaceholder } from "@/components/ui/copy-placeholder";
import { SectionHeading } from "@/components/ui/section-heading";
import { verticals } from "@/data/verticals";

/**
 * Four-vertical overview (reference panel 03). Used on the homepage (H2) and /events.
 */
export function VerticalsOverview({
  headingAs = "h2",
  title = "Ashwamedh",
  id,
}: {
  headingAs?: "h1" | "h2";
  title?: string;
  id?: string;
}) {
  return (
    <section
      id={id}
      data-vertical="brand"
      aria-labelledby="verticals-title"
      className="relative section-y"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(50%_100%_at_50%_0%,color-mix(in_oklab,var(--brand-ember)_10%,transparent),transparent)]"
      />
      <div className="relative container-site">
        <SectionHeading
          as={headingAs}
          id="verticals-title"
          eyebrow={
            // OD-07: eyebrow copy area kept; reference text not used
            <CopyPlaceholder lines={1} align="center" className="mb-5 w-48" />
          }
        >
          {title}
        </SectionHeading>

        <ul className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-5 lg:mt-16 lg:grid-cols-4 lg:gap-6">
          {verticals.map((vertical) => (
            <li key={vertical.id}>
              <VerticalCard vertical={vertical} headingLevel={headingAs === "h1" ? "h2" : "h3"} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
