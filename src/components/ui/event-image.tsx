import Image from "next/image";
import { VerticalArt } from "@/components/art/vertical-art";
import { eventImageSrc } from "@/lib/media";
import type { EventRecord } from "@/types/festival";

/**
 * Event artwork slot (event cards and the event-detail header). Renders the official event
 * image when one exists, otherwise the abstract vertical art (D5). Fills its parent, which
 * must be positioned and sized (it already is in both placements).
 *
 * Alt text: the official alt text entered with an uploaded image (Phase 10.4), otherwise `alt=""`
 * — the event name is always the adjacent heading, and describing an image's content without an
 * official description would mean inventing text. The optimizer applies EXIF orientation.
 */
export function EventImage({
  event,
  variant,
  sizes,
  preload = false,
}: {
  event: Pick<EventRecord, "slug" | "image" | "imageAlt" | "category">;
  /** Abstract-art variant, so placeholders in a grid don't repeat. */
  variant: number;
  /** `sizes` for the responsive image, matching the slot's rendered width. */
  sizes: string;
  /** Above-the-fold placement (event detail): preload the image. */
  preload?: boolean;
}) {
  const src = eventImageSrc(event.image, event.slug);
  if (!src) return <VerticalArt vertical={event.category} variant={variant} />;

  return (
    <Image
      src={src}
      alt={event.imageAlt ?? ""}
      fill
      sizes={sizes}
      preload={preload}
      className="object-cover"
    />
  );
}
