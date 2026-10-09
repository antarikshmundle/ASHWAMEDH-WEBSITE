"use server";

import { requireAdmin } from "@/lib/admin/auth";
import {
  getEventForEdit,
  getRevision,
  inventoryEvent,
  listRevisions,
  saveEventContent,
  type RevisionSummary,
} from "@/lib/cms/admin-events";
import {
  parseEventForm,
  recordToFormValues,
  validateEventForm,
  type EventFormValues,
  type FieldErrors,
} from "@/lib/cms/event-form";
import { expireEventContent } from "@/lib/cms/revalidate";

/**
 * Event editor Server Actions (Phase 10.3). Next.js rejects cross-origin calls; each action
 * re-checks the admin session, re-validates the slug against the frozen inventory, validates the
 * content on the server, saves atomically, and only then refreshes that event's public pages.
 */

export interface EditorState {
  status: "idle" | "saved" | "restored" | "invalid" | "conflict" | "missing" | "error";
  /** Version the form is based on (events_content.updated_at). */
  version: string;
  /** Increments on every response, so the form re-renders even for a repeated status. */
  nonce: number;
  values?: EventFormValues;
  errors?: FieldErrors;
  /** Fresh history after a successful save or restore. */
  revisions?: RevisionSummary[];
}

type Result = Omit<EditorState, "nonce">;

async function save(
  slug: string,
  version: string,
  values: EventFormValues,
  status: "saved" | "restored",
): Promise<Result> {
  const identity = inventoryEvent(slug);
  if (!identity) return { status: "missing", version };

  let current;
  try {
    current = await getEventForEdit(slug);
  } catch (error) {
    console.error(`[cms] loading "${slug}" before save failed: ${(error as Error).message}`);
    return { status: "error", version, values };
  }
  if (!current?.record) return { status: "missing", version, values };

  const checked = validateEventForm(identity, values, { hasManagedFiles: current.hasManagedFiles });
  if (!checked.ok) return { status: "invalid", version, values, errors: checked.errors };

  let outcome;
  try {
    outcome = await saveEventContent(slug, version, checked.content, checked.coordinators);
  } catch (error) {
    console.error(`[cms] saving "${slug}" failed: ${(error as Error).message}`);
    return { status: "error", version, values };
  }
  if (!outcome.ok) {
    const map = { conflict: "conflict", missing: "missing", failed: "error" } as const;
    return { status: map[outcome.reason], version, values };
  }

  await expireEventContent(slug);
  let revisions: RevisionSummary[] | undefined;
  try {
    revisions = await listRevisions(slug);
  } catch {
    revisions = undefined; // the save itself succeeded; the history refreshes on the next load
  }
  // Re-display what was actually stored (normalised), based on the new version.
  return {
    status,
    version: outcome.version,
    values: recordToFormValues({
      ...current.record,
      ...checked.content,
      event_coordinators: checked.coordinators,
    }),
    revisions,
  };
}

const respond = (previous: EditorState | undefined, result: Result): EditorState => ({
  ...result,
  nonce: (previous?.nonce ?? 0) + 1,
});

export async function saveEventAction(
  slug: string,
  previous: EditorState,
  formData: FormData,
): Promise<EditorState> {
  await requireAdmin();
  const version = String(formData.get("version") ?? "");
  return respond(previous, await save(slug, version, parseEventForm(formData), "saved"));
}

export async function restoreRevisionAction(
  slug: string,
  previous: EditorState,
  formData: FormData,
): Promise<EditorState> {
  await requireAdmin();
  const version = String(formData.get("version") ?? "");
  const revisionId = String(formData.get("revisionId") ?? "");
  let revision;
  try {
    revision = await getRevision(slug, revisionId);
  } catch (error) {
    console.error(`[cms] loading revision for "${slug}" failed: ${(error as Error).message}`);
    return respond(previous, { status: "error", version });
  }
  if (!revision) {
    return respond(previous, {
      status: "invalid",
      version,
      errors: { form: "That version no longer exists." },
    });
  }
  return respond(previous, await save(slug, version, recordToFormValues(revision), "restored"));
}

/** Single entry point for the editor form: `intent` = "save" (default) or "restore". */
export async function editorAction(
  slug: string,
  previous: EditorState,
  formData: FormData,
): Promise<EditorState> {
  return formData.get("intent") === "restore"
    ? restoreRevisionAction(slug, previous, formData)
    : saveEventAction(slug, previous, formData);
}
