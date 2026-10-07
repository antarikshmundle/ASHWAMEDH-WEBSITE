/**
 * Festival-level content. Only confirmed facts; unknown values are `null` (D2, OD-07, OD-08).
 */

/** Contact details — all on hold (master prompt §7). */
export const contact = {
  phone: null as string | null,
  whatsapp: null as string | null,
  email: null as string | null,
};

/** Official social handles — none yet; icons stay hidden (OD-08). */
export const socialLinks: readonly { label: string; href: string }[] = [];

/** Cultural Night — two nights confirmed; dates TBA. */
export const culturalNight = {
  nights: [
    { label: "Day 1", date: null as string | null },
    { label: "Day 2", date: null as string | null },
  ],
  /** "What's On" — exactly the four confirmed components (OD-14). */
  whatsOn: ["Group Dance", "Singing", "Solo Dance", "Inauguration / Stage Performances"] as const,
  /** No public registration by default (OD-14). */
  registrationLink: null as string | null,
};

/**
 * Schedule category rows (docs/ux/page-structures.md). Titles are confirmed festival
 * components; time and venue stay `null` (OD-04, OD-05). No day tabs until official.
 */
export const scheduleRows = [
  { title: "Inauguration Ceremony", vertical: "brand", href: "/cultural-night" },
  { title: "Technomedh Events", vertical: "technomedh", href: "/technomedh" },
  { title: "Cultural Events", vertical: "cultural", href: "/cultural" },
  { title: "Sports Events", vertical: "sports", href: "/sports" },
  { title: "Cultural Night", vertical: "cultural-night", href: "/cultural-night" },
].map((row) => ({
  ...row,
  time: null as string | null,
  venue: null as string | null,
})) as readonly {
  title: string;
  vertical: "brand" | "technomedh" | "cultural" | "sports" | "cultural-night";
  href: string;
  time: string | null;
  venue: string | null;
}[];

/** Official day count — unknown (OD-04). Day tabs render only when this is set. */
export const scheduleDays: readonly { label: string; date: string | null }[] | null = null;
