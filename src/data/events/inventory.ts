import type { EventIdentity } from "@/types/festival";

/**
 * Frozen event inventory — the only source of events (master prompt §6; names per OD-01/OD-02).
 * 14 Technomedh · 15 Cultural · 10 Sports, in this order (it drives listing order and card art).
 *
 * Slugs are explicit and permanent: each equals the slug rule applied to the official name
 * (docs/ux/sitemap-and-routes.md §3), frozen so a name change can never silently change a URL.
 * Only identity lives here. Official details (rules, fees, coordinators…) are added separately once
 * official PDFs/forms exist — never invented here.
 */
export const eventInventory = [
  {
    slug: "paper-presentation",
    name: "Paper Presentation",
    category: "technomedh",
    department: "Mechanical Engineering",
  },
  {
    slug: "rocketry",
    name: "Rocketry",
    category: "technomedh",
    department: "Aeronautical Engineering",
  },
  {
    slug: "sdgineer",
    name: "SDGineer (Poster Presentation)",
    category: "technomedh",
    department: "Chemical Engineering",
  },
  {
    slug: "technical-ad-mad-show",
    name: "Technical AD-MAD Show",
    category: "technomedh",
    department: "Biotechnology",
  },
  {
    slug: "project-competition",
    name: "Project Competition",
    category: "technomedh",
    department: "Electrical Engineering / E&P",
  },
  {
    slug: "bridge-modelling",
    name: "Bridge Modelling",
    category: "technomedh",
    department: "Civil Engineering",
  },
  {
    slug: "mock-placement",
    name: "Mock Placement",
    category: "technomedh",
    department: "Computer Technology",
  },
  {
    slug: "blind-c",
    name: "Blind-C",
    category: "technomedh",
    department: "Computer Science Engineering",
  },
  {
    slug: "hackathon",
    name: "Hackathon",
    category: "technomedh",
    department: "Information Technology",
  },
  {
    slug: "technical-quiz",
    name: "Technical Quiz",
    category: "technomedh",
    department: "Electronics and Telecommunication",
  },
  {
    slug: "breadboard-competition",
    name: "Breadboard Competition",
    category: "technomedh",
    department: "Electronics and Communication",
  },
  {
    slug: "business-ideathon",
    name: "Business Ideathon",
    category: "technomedh",
    department: "Industrial IOT",
  },
  { slug: "robo-craft", name: "Robo-Craft", category: "technomedh", department: "Robotics and AI" },
  {
    slug: "brand-manthan",
    name: "Brand Manthan",
    category: "technomedh",
    department: "First Year",
  },
  {
    slug: "on-spot-painting",
    name: "On Spot Painting",
    category: "cultural",
    department: "Mechanical Engineering",
  },
  {
    slug: "skit-competition",
    name: "Skit Competition",
    category: "cultural",
    department: "Aeronautical Engineering",
  },
  {
    slug: "crafted-cuts",
    name: "Crafted Cuts",
    category: "cultural",
    department: "Chemical Engineering",
  },
  {
    slug: "on-spot-prop-story",
    name: "On Spot Prop Story",
    category: "cultural",
    department: "Biotechnology",
  },
  {
    slug: "mono-acting",
    name: "Mono Acting",
    category: "cultural",
    department: "Electrical Engineering / E&P",
  },
  { slug: "mimicry", name: "Mimicry", category: "cultural", department: "Civil Engineering" },
  {
    slug: "film-making",
    name: "Film Making",
    category: "cultural",
    department: "Computer Technology",
  },
  { slug: "mime", name: "Mime", category: "cultural", department: "Computer Science Engineering" },
  {
    slug: "tattoo-making",
    name: "Tattoo Making",
    category: "cultural",
    department: "Information Technology",
  },
  {
    slug: "face-painting",
    name: "Face Painting",
    category: "cultural",
    department: "Electronics and Telecommunication",
  },
  {
    slug: "sketching",
    name: "Sketching",
    category: "cultural",
    department: "Electronics and Communication",
  },
  {
    slug: "on-spot-poster-making",
    name: "On Spot Poster Making",
    category: "cultural",
    department: "Industrial IOT",
  },
  {
    slug: "on-spot-photography",
    name: "On Spot Photography",
    category: "cultural",
    department: "Robotics and AI",
  },
  { slug: "mehendi", name: "Mehendi", category: "cultural", department: "First Year" },
  { slug: "debate", name: "Debate", category: "cultural", department: "AI & DS" },
  { slug: "cricket", name: "Cricket", category: "sports", department: null },
  { slug: "football", name: "Football", category: "sports", department: null },
  { slug: "basketball", name: "Basketball", category: "sports", department: null },
  { slug: "volleyball", name: "Volleyball", category: "sports", department: null },
  { slug: "badminton", name: "Badminton", category: "sports", department: null },
  { slug: "chess", name: "Chess", category: "sports", department: null },
  { slug: "table-tennis", name: "Table Tennis", category: "sports", department: null },
  { slug: "long-jump", name: "Long Jump", category: "sports", department: null },
  { slug: "100m-running", name: "100m Running", category: "sports", department: null },
  { slug: "carrom", name: "Carrom", category: "sports", department: null },
  { slug: "tug-of-war", name: "Tug of War", category: "sports", department: null },
] as const satisfies readonly EventIdentity[];

/** Every valid event slug, as a literal union. */
export type EventSlug = (typeof eventInventory)[number]["slug"];
