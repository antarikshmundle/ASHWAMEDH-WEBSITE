import type { EventVertical, Vertical } from "@/types/festival";

export interface VerticalInfo {
  id: Vertical;
  /** Display name (official). */
  name: string;
  /** Short name used on cards and the hero word stack. */
  shortName: string;
  href: string;
  /** Overview-card link label (reference panel 03). */
  linkLabel: string;
  /** Lucide icon name (docs/design-system/verticals.md). */
  icon: "Settings" | "Palette" | "Trophy" | "Music";
  /** Official tagline — `null` until approved (OD-07). */
  tagline: string | null;
}

/** Fixed order from the reference: Technomedh → Cultural → Sports → Cultural Night. */
export const verticals: readonly VerticalInfo[] = [
  {
    id: "technomedh",
    name: "Technomedh",
    shortName: "Technomedh",
    href: "/technomedh",
    linkLabel: "Explore Events",
    icon: "Settings",
    tagline: null,
  },
  {
    id: "cultural",
    name: "Cultural Events",
    shortName: "Cultural",
    href: "/cultural",
    linkLabel: "Explore Events",
    icon: "Palette",
    tagline: null,
  },
  {
    id: "sports",
    name: "Sports",
    shortName: "Sports",
    href: "/sports",
    linkLabel: "Explore Events",
    icon: "Trophy",
    tagline: null,
  },
  {
    id: "cultural-night",
    name: "Cultural Night",
    shortName: "Cultural Night",
    href: "/cultural-night",
    linkLabel: "Explore",
    icon: "Music",
    tagline: null,
  },
];

export function getVertical(id: Vertical): VerticalInfo {
  const vertical = verticals.find((v) => v.id === id);
  if (!vertical) throw new Error(`Unknown vertical: ${id}`);
  return vertical;
}

export const eventVerticals: readonly EventVertical[] = ["technomedh", "cultural", "sports"];
