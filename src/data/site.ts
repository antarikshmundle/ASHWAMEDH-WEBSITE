/**
 * Confirmed festival identity. Only facts that are officially known belong here;
 * anything not yet announced stays out (see docs/content/README.md).
 */
export const site = {
  name: "ASHWAMEDH 2026",
  shortName: "ASHWAMEDH",
  college: "Priyadarshini College of Engineering",
  collegeShort: "PCE",
  city: "Nagpur",
  /**
   * Abbreviated college name for the logo lockups. Split where the stacked (footer)
   * lockup breaks lines; the navbar joins it on one line.
   */
  collegeLockup: ["Priyadarshini", "College of Engg."],
  /** Positioning line under the hero logo and in the footer brand block. */
  festLine: "PCE's Flagship Annual Fest",
  description:
    "ASHWAMEDH 2026 — the flagship annual college festival of Priyadarshini College of Engineering (PCE), Nagpur.",
} as const;
