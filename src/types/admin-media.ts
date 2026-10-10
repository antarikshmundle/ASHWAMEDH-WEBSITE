/**
 * Plain data the admin media panels receive from the editor page (Phase 10.4.5). Kept outside
 * src/lib/cms so client components can use the types without importing CMS code.
 */

/** One linked file as the media panels show it. */
export interface MediaFileSummary {
  name: string;
  sizeBytes: number;
  uploadedLabel: string;
  url: string;
  width: number | null;
  height: number | null;
  altText: string | null;
}

/** What the editor's media panels need (plain data, safe to pass to client components). */
export interface EventMediaSummary {
  image: MediaFileSummary | null;
  /** A repository image path linked instead of an upload (replaced by an upload — D2). */
  imagePath: string | null;
  guidelines: MediaFileSummary | null;
  /** A guidelines link entered in the form instead of an upload (replaced by an upload — D2). */
  guidelinesUrl: string | null;
  /** D3: files can be added only once the event's content source is saved. */
  hasSource: boolean;
}
