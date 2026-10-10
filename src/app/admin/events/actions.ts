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
import { restoreEventRevision, type MissingMedia } from "@/lib/cms/media-admin";
import { expireEventContent } from "@/lib/cms/revalidate";

/**
 * Event editor Server Actions (Phase 10.3). Next.js rejects cross-origin calls; each action
 * re-checks the admin session, re-validates the slug against the frozen inventory, validates the
 * content on the server, saves atomically, and only then refreshes that event's public pages.
 * Since 10.4 a restore goes through cms_restore_event, which also restores media links (D5).
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
  /** After a restore: media the revision linked that no longer exists (left empty). */
  missingMedia?: MissingMedia;
}

type Result = Omit<EditorState, "nonce">;

type Mode = { kind: "save" } | { kind: "restore"; revisionId: string; hasManagedFiles: boolean };

async function save(
  slug: string,
  version: string,
  values: EventFormValues,
  mode: Mode,
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

  // A restored revision brings its own media links back, so its files decide the source rule.
  const hasManagedFiles = mode.kind === "restore" ? mode.hasManagedFiles : current.hasManagedFiles;
  const checked = validateEventForm(identity, values, {
    hasManagedFiles,
    // A restore brings its own (consistent) pair of guidelines link and file.
    hasGuidelinesFile: mode.kind === "save" && Boolean(current.record.guidelines_file_id),
  });
  if (!checked.ok) return { status: "invalid", version, values, errors: checked.errors };

  let outcome;
  let missingMedia: MissingMedia | undefined;
  try {
    if (mode.kind === "save") {
      outcome = await saveEventContent(slug, version, checked.content, checked.coordinators);
    } else {
      const restored = await restoreEventRevision(slug, version, mode.revisionId);
      if (!restored.ok && restored.reason === "invalid") {
        return { status: "invalid", version, errors: { form: "That version no longer exists." } };
      }
      const map = { conflict: "conflict", missing: "missing" } as const;
      outcome = restored.ok
        ? ({ ok: true, version: restored.version } as const)
        : ({
            ok: false,
            reason: restored.reason in map ? map[restored.reason as keyof typeof map] : "failed",
          } as const);
      if (restored.ok && restored.missing.length) missingMedia = restored.missing;
    }
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
    status: mode.kind === "save" ? "saved" : "restored",
    version: outcome.version,
    values: recordToFormValues({
      ...current.record,
      ...checked.content,
      event_coordinators: checked.coordinators,
    }),
    revisions,
    ...(missingMedia ? { missingMedia } : {}),
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
  return respond(previous, await save(slug, version, parseEventForm(formData), { kind: "save" }));
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
  const hasManagedFiles = Boolean(
    revision.image_file_id || revision.image_path || revision.guidelines_file_id,
  );
  return respond(
    previous,
    await save(slug, version, recordToFormValues(revision), {
      kind: "restore",
      revisionId,
      hasManagedFiles,
    }),
  );
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
