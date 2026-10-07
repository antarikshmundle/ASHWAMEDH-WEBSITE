export interface NavItem {
  label: string;
  href: string;
  /** Route prefixes that mark this item active (docs/ux/navigation.md). */
  match?: readonly string[];
}

/** Primary navigation — exact reference order (OD-09, OD-10, OD-15). */
export const primaryNav: readonly NavItem[] = [
  { label: "Home", href: "/" },
  {
    label: "Events",
    href: "/events",
    match: ["/events", "/technomedh", "/cultural", "/sports"],
  },
  { label: "Cultural Night", href: "/cultural-night" },
  { label: "Schedule", href: "/schedule" },
  { label: "Gallery", href: "/gallery" },
  { label: "Team", href: "/team" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];

/** Footer "Quick Links" — reference order; Team and Venue not added (OD-09, OD-10). */
export const footerQuickLinks: readonly NavItem[] = [
  { label: "Home", href: "/" },
  { label: "Events", href: "/events" },
  { label: "Cultural Night", href: "/cultural-night" },
  { label: "Schedule", href: "/schedule" },
  { label: "Gallery", href: "/gallery" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];

export function isActive(pathname: string, item: NavItem): boolean {
  if (item.href === "/") return pathname === "/";
  const prefixes = item.match ?? [item.href];
  // Segment-exact match, so "/cultural" never matches "/cultural-night".
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}
