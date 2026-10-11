/**
 * Plain data for the admin Gallery and Team managers (Phase 10.6). Outside src/lib/cms so client
 * components can use the types.
 */

export interface SourceFields {
  sourceKind: string;
  sourceReference: string;
  sourceDate: string;
}

export interface AdminGalleryItemView extends SourceFields {
  id: string;
  version: string;
  caption: string;
  altText: string;
  status: "draft" | "published";
  /** Public Storage URL of the image (null if the stored path is unexpected). */
  url: string | null;
}

export interface AdminTeamMemberView extends SourceFields {
  id: string;
  version: string;
  name: string;
  role: string;
  groupLabel: string;
  status: "draft" | "published";
}
