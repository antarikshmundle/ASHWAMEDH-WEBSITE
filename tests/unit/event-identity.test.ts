import { describe, expect, it } from "vitest";
import { eventInventory, events, getEventBySlug } from "@/data/events";
import { toSlug } from "@/lib/slug";

/**
 * Frozen identity snapshot (Phase 6.1). Written out independently of the inventory on purpose:
 * any change to a slug, name, vertical, department or the order fails here and must be a
 * deliberate, owner-approved edit to both lists.
 */
const FROZEN: [slug: string, name: string, category: string, department: string | null][] = [
  ["paper-presentation", "Paper Presentation", "technomedh", "Mechanical Engineering"],
  ["rocketry", "Rocketry", "technomedh", "Aeronautical Engineering"],
  ["sdgineer", "SDGineer (Poster Presentation)", "technomedh", "Chemical Engineering"],
  ["technical-ad-mad-show", "Technical AD-MAD Show", "technomedh", "Biotechnology"],
  ["project-competition", "Project Competition", "technomedh", "Electrical Engineering / E&P"],
  ["bridge-modelling", "Bridge Modelling", "technomedh", "Civil Engineering"],
  ["mock-placement", "Mock Placement", "technomedh", "Computer Technology"],
  ["blind-c", "Blind-C", "technomedh", "Computer Science Engineering"],
  ["hackathon", "Hackathon", "technomedh", "Information Technology"],
  ["technical-quiz", "Technical Quiz", "technomedh", "Electronics and Telecommunication"],
  [
    "breadboard-competition",
    "Breadboard Competition",
    "technomedh",
    "Electronics and Communication",
  ],
  ["business-ideathon", "Business Ideathon", "technomedh", "Industrial IOT"],
  ["robo-craft", "Robo-Craft", "technomedh", "Robotics and AI"],
  ["brand-manthan", "Brand Manthan", "technomedh", "First Year"],
  ["on-spot-painting", "On Spot Painting", "cultural", "Mechanical Engineering"],
  ["skit-competition", "Skit Competition", "cultural", "Aeronautical Engineering"],
  ["crafted-cuts", "Crafted Cuts", "cultural", "Chemical Engineering"],
  ["on-spot-prop-story", "On Spot Prop Story", "cultural", "Biotechnology"],
  ["mono-acting", "Mono Acting", "cultural", "Electrical Engineering / E&P"],
  ["mimicry", "Mimicry", "cultural", "Civil Engineering"],
  ["film-making", "Film Making", "cultural", "Computer Technology"],
  ["mime", "Mime", "cultural", "Computer Science Engineering"],
  ["tattoo-making", "Tattoo Making", "cultural", "Information Technology"],
  ["face-painting", "Face Painting", "cultural", "Electronics and Telecommunication"],
  ["sketching", "Sketching", "cultural", "Electronics and Communication"],
  ["on-spot-poster-making", "On Spot Poster Making", "cultural", "Industrial IOT"],
  ["on-spot-photography", "On Spot Photography", "cultural", "Robotics and AI"],
  ["mehendi", "Mehendi", "cultural", "First Year"],
  ["debate", "Debate", "cultural", "AI & DS"],
  ["cricket", "Cricket", "sports", null],
  ["football", "Football", "sports", null],
  ["basketball", "Basketball", "sports", null],
  ["volleyball", "Volleyball", "sports", null],
  ["badminton", "Badminton", "sports", null],
  ["chess", "Chess", "sports", null],
  ["table-tennis", "Table Tennis", "sports", null],
  ["long-jump", "Long Jump", "sports", null],
  ["100m-running", "100m Running", "sports", null],
  ["carrom", "Carrom", "sports", null],
  ["tug-of-war", "Tug of War", "sports", null], // added by owner correction (Phase 7.6)
];

describe("frozen event identity (Phase 6.1)", () => {
  it("matches the frozen snapshot exactly — slugs, names, verticals, departments and order", () => {
    expect(eventInventory.map((e) => [e.slug, e.name, e.category, e.department])).toEqual(FROZEN);
  });

  it("keeps every explicit slug equal to the slug rule applied to the official name", () => {
    for (const e of eventInventory) expect(e.slug, e.name).toBe(toSlug(e.name));
  });

  it("has unique, URL-safe slugs", () => {
    const slugs = eventInventory.map((e) => e.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it("feeds the UI events unchanged: same identity, order and lookup", () => {
    expect(events.map((e) => [e.slug, e.name, e.category, e.department])).toEqual(FROZEN);
    for (const [slug, name] of FROZEN) expect(getEventBySlug(slug)?.name).toBe(name);
  });
});
