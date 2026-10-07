import Image from "next/image";
import { VerticalArt } from "@/components/art/vertical-art";
import { eventImageSrc } from "@/lib/media";
import type { FestEvent } from "@/types/festival";

/**
 * Event artwork slot (event cards and the event-detail header). Renders the official event
 * image when one exists, otherwise the abstract vertical art (D5). Fills its parent, which
 * must be positioned and sized (it already is in both placements).
 *
 * The image is decorative (`alt=""`): the event name is always the adjacent heading, and
 * describing an official image's content would mean inventing text.
 */
export function EventImage({
  event,
  variant,
  sizes,
  preload = false,
}: {
  event: Pick<FestEvent, "image" | "category">;
  /** Abstract-art variant, so placeholders in a grid don't repeat. */
  variant: number;
  /** `sizes` for the responsive image, matching the slot's rendered width. */
  sizes: string;
  /** Above-the-fold placement (event detail): preload the image. */
  preload?: boolean;
}) {
  const src = eventImageSrc(event.image);
  if (!src) return <VerticalArt vertical={event.category} variant={variant} />;

  return <Image src={src} alt="" fill sizes={sizes} preload={preload} className="object-cover" />;
}
