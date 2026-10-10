/**
 * CMS row shapes and constants (Phase 10.2) — mirror of supabase/migrations/*.sql.
 * Event identity is not here: it stays in src/data/events/inventory.ts.
 */
import type { ContentSource, Participation, RegistrationStatus } from "@/types/festival";

export const CMS_TABLES = {
  events: "events_content",
  coordinators: "event_coordinators",
  files: "cms_files",
  tickets: "cms_upload_tickets",
} as const;

export const BUCKETS = {
  documents: "ashwamedh-documents",
  images: "ashwamedh-images",
} as const;
export type Bucket = (typeof BUCKETS)[keyof typeof BUCKETS];

/** Private bucket for signed direct uploads awaiting validation (Phase 10.4); never in cms_files. */
export const STAGING_BUCKET = "ashwamedh-staging";

export type FileCategory = "document" | "event-image" | "gallery-image" | "team-image" | "logo";

/** events_content — editable content for one frozen event slug. NULL = not officially known. */
export interface EventContentRow {
  event_slug: string;
  description: string[] | null;
  rules: string[] | null;
  eligibility: string[] | null;
  participation: Participation | null;
  team_size: string | null;
  registration_fee: string | null;
  event_date: string | null;
  event_time: string | null;
  venue: string | null;
  image_file_id: string | null;
  image_path: string | null;
  guidelines_file_id: string | null;
  guidelines_url: string | null;
  registration_status: RegistrationStatus;
  registration_url: string | null;
  registration_deadline: string | null;
  source_kind: ContentSource["kind"] | null;
  source_reference: string | null;
  source_date: string | null;
}

/** event_coordinators — several per event, ordered by sort_order. */
export interface CoordinatorRow {
  event_slug: string;
  name: string;
  designation: string | null;
  phone: string | null;
  email: string | null;
  sort_order: number;
}

/** cms_files — metadata; the bytes live in Supabase Storage. */
export interface FileRow {
  id: string;
  bucket: Bucket;
  path: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  category: FileCategory;
  alt_text: string | null;
  /** Images only (Phase 10.4, D6); NULL for documents. */
  width?: number | null;
  height?: number | null;
}

export type TicketStatus = "issued" | "processing" | "finalized" | "failed";

/** cms_upload_tickets — one signed direct upload (Phase 10.4, D1). */
export interface UploadTicketRow {
  id: string;
  event_slug: string;
  kind: "image" | "guidelines";
  object_path: string;
  original_name: string;
  declared_type: string;
  declared_size: number;
  status: TicketStatus;
  issued_at: string;
  expires_at: string;
  processing_at: string | null;
  finished_at: string | null;
  file_id: string | null;
  failure: string | null;
}

/** The columns of a file that the public site needs. */
export type FileRef = Pick<FileRow, "bucket" | "path"> & { alt_text?: string | null };

/** Content row with its coordinators and linked files, as the public reader selects it. */
export interface EventContentRecord extends EventContentRow {
  event_coordinators: Omit<CoordinatorRow, "event_slug">[] | null;
  guidelines_file: FileRef | null;
  image_file: FileRef | null;
}

/** PostgREST select for EventContentRecord (embedded coordinators and files). */
export const EVENT_CONTENT_SELECT = [
  "*",
  "event_coordinators(name,designation,phone,email,sort_order)",
  "guidelines_file:cms_files!events_content_guidelines_file_id_fkey(bucket,path)",
  "image_file:cms_files!events_content_image_file_id_fkey(bucket,path,alt_text)",
].join(",");

/** Cache tags for public reads (src/lib/cms/events.ts) and their invalidation (revalidate.ts). */
export const EVENTS_TAG = "cms:events";
export const eventTag = (slug: string) => `cms:event:${slug}`;
