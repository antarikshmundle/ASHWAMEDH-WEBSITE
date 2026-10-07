import { toSlug } from "@/lib/slug";
import type { Department, EventVertical, FestEvent } from "@/types/festival";

/**
 * Confirmed event inventory (master prompt §6; names per OD-01/OD-02).
 * Only names, verticals and departments are official. Every other field stays `null`
 * until official PDFs/forms are released — do not fill them with placeholder text.
 */
type InventoryEntry = { name: string; department: Department | null };

const technomedh: InventoryEntry[] = [
  { department: "Mechanical Engineering", name: "Paper Presentation" },
  { department: "Aeronautical Engineering", name: "Rocketry" },
  { department: "Chemical Engineering", name: "SDGineer (Poster Presentation)" },
  { department: "Biotechnology", name: "Technical AD-MAD Show" },
  { department: "Electrical Engineering / E&P", name: "Project Competition" },
  { department: "Civil Engineering", name: "Bridge Modelling" },
  { department: "Computer Technology", name: "Mock Placement" },
  { department: "Computer Science Engineering", name: "Blind-C" },
  { department: "Information Technology", name: "Hackathon" },
  { department: "Electronics and Telecommunication", name: "Technical Quiz" },
  { department: "Electronics and Communication", name: "Breadboard Competition" },
  { department: "Industrial IOT", name: "Business Ideathon" },
  { department: "Robotics and AI", name: "Robo-Craft" },
  { department: "First Year", name: "Brand Manthan" },
];

const cultural: InventoryEntry[] = [
  { department: "Mechanical Engineering", name: "On Spot Painting" },
  { department: "Aeronautical Engineering", name: "Skit Competition" },
  { department: "Chemical Engineering", name: "Crafted Cuts" },
  { department: "Biotechnology", name: "On Spot Prop Story" },
  { department: "Electrical Engineering / E&P", name: "Mono Acting" },
  { department: "Civil Engineering", name: "Mimicry" },
  { department: "Computer Technology", name: "Film Making" },
  { department: "Computer Science Engineering", name: "Mime" },
  { department: "Information Technology", name: "Tattoo Making" },
  { department: "Electronics and Telecommunication", name: "Face Painting" },
  { department: "Electronics and Communication", name: "Sketching" },
  { department: "Industrial IOT", name: "On Spot Poster Making" },
  { department: "Robotics and AI", name: "On Spot Photography" },
  { department: "First Year", name: "Mehendi" },
  { department: "AI & DS", name: "Debate" },
];

const sports: InventoryEntry[] = [
  "Cricket",
  "Football",
  "Basketball",
  "Volleyball",
  "Badminton",
  "Chess",
  "Table Tennis",
  "Long Jump",
  "100m Running",
  "Carrom",
].map((name) => ({ name, department: null }));

function toEvent(category: EventVertical, entry: InventoryEntry): FestEvent {
  return {
    id: toSlug(entry.name),
    name: entry.name,
    category,
    department: entry.department,
    description: null,
    image: null,
    rules: null,
    eligibility: null,
    teamSize: null,
    registrationFee: null,
    prize: null,
    date: null,
    time: null,
    venue: null,
    coordinator: null,
    registrationDeadline: null,
    registrationLink: null,
    pdf: null,
    status: "not-open",
  };
}

export const events: readonly FestEvent[] = [
  ...technomedh.map((e) => toEvent("technomedh", e)),
  ...cultural.map((e) => toEvent("cultural", e)),
  ...sports.map((e) => toEvent("sports", e)),
];

export function getEventsByVertical(vertical: EventVertical): FestEvent[] {
  return events.filter((event) => event.category === vertical);
}

export function getEventBySlug(slug: string): FestEvent | undefined {
  return events.find((event) => event.id === slug);
}
