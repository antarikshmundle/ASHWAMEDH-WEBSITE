"use client";

import { useActionState, useEffect, useRef, useState, type FormEvent } from "react";
import { editorAction, type EditorState } from "@/app/admin/events/actions";
import {
  Section,
  SelectField,
  TextAreaField,
  TextField,
  controlClass,
  describedBy,
} from "./fields";

/**
 * Event editor (Phase 10.3). Edits the official CONTENT of one frozen event; identity is shown
 * read-only by the page. Saves go through a Server Action that re-checks the admin session and
 * validates on the server. This component only improves the experience: unsaved-changes guard,
 * pending state, error summary, coordinator rows, version history.
 */

type Values = NonNullable<EditorState["values"]>;
type Coordinator = Values["coordinators"][number];
type Revision = NonNullable<EditorState["revisions"]>[number];

export interface EditorLimits {
  short: number;
  venue: number;
  coordinators: number;
  sourceReference: number;
  url: number;
}

interface Props {
  slug: string;
  publicHref: string;
  initialValues: Values;
  initialVersion: string;
  initialRevisions: Revision[];
  managed: { image: boolean; guidelinesFile: boolean };
  limits: EditorLimits;
}

const PARTICIPATION = [
  { value: "", label: "TBA (not stated yet)" },
  { value: "individual", label: "Individual" },
  { value: "team", label: "Team" },
  { value: "individual-or-team", label: "Individual or team" },
] as const;
const STATUS = [
  { value: "not-open", label: "Not open — shows “Registration Opening Soon”" },
  { value: "open", label: "Open — shows “Register Now” (needs the Google Form link)" },
  { value: "closed", label: "Closed — shows “Registration Closed”" },
] as const;
const SOURCE_KIND = [
  { value: "", label: "Choose…" },
  { value: "official-pdf", label: "Official PDF" },
  { value: "official-form", label: "Official Google Form" },
  { value: "owner-confirmed", label: "Confirmed by the organisers" },
] as const;

const FIELD_LABELS: Record<string, string> = {
  form: "Content",
  description: "Description",
  rules: "Rules",
  eligibility: "Eligibility",
  participation: "Participation",
  teamSize: "Team size",
  registrationFee: "Registration fee",
  date: "Date",
  time: "Time",
  venue: "Venue",
  guidelinesUrl: "Guidelines PDF link",
  registrationStatus: "Registration status",
  registrationUrl: "Google Form link",
  registrationDeadline: "Registration deadline",
  sourceKind: "Source type",
  sourceReference: "Source reference",
  sourceDate: "Date received",
  coordinators: "Coordinators",
};
const fieldId = (key: string) => `f-${key.replace(/\./g, "-")}`;
const errorLabel = (key: string) => {
  const m = /^coordinators\.(\d+)\.(\w+)$/.exec(key);
  return m ? `Coordinator ${Number(m[1]) + 1} — ${m[2]}` : (FIELD_LABELS[key] ?? key);
};

/** Row keys: deterministic for server data (`<nonce>-<index>`), random only in click handlers. */
const withIds = (rows: Coordinator[], nonce: number) =>
  rows.map((row, i) => ({ ...row, id: `${nonce}-${i}` }));

export function EventEditorForm(props: Props) {
  const [state, formAction, pending] = useActionState(editorAction.bind(null, props.slug), {
    status: "idle",
    version: props.initialVersion,
    nonce: 0,
    values: props.initialValues,
  } satisfies EditorState);

  const values = state.values ?? props.initialValues;
  const errors = state.errors ?? {};
  const errorKeys = Object.keys(errors);

  // Adjust local state when a new server response arrives (React's "derive from props" pattern).
  const [seen, setSeen] = useState(state.nonce);
  const [revisions, setRevisions] = useState(props.initialRevisions);
  const [rows, setRows] = useState(() => withIds(values.coordinators, state.nonce));
  const [dirty, setDirty] = useState(false);
  if (seen !== state.nonce) {
    setSeen(state.nonce);
    if (state.revisions) setRevisions(state.revisions);
    setRows(withIds(values.coordinators, state.nonce));
    if (state.status === "saved" || state.status === "restored") setDirty(false);
  }

  // Unsaved changes: ask before leaving the page.
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  // Move focus to the error summary after a failed save.
  const summaryRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (state.status === "invalid") summaryRef.current?.focus();
  }, [state.nonce, state.status]);

  const updateRow = (id: string, field: keyof Coordinator, value: string) =>
    setRows((current) => current.map((row) => (row.id === id ? { ...row, [field]: value } : row)));
  const moveRow = (index: number, by: -1 | 1) =>
    setRows((current) => {
      const next = [...current];
      const [row] = next.splice(index, 1);
      next.splice(index + by, 0, row!);
      return next;
    });
  const changed = () => setDirty(true);

  const confirmRestore = (event: FormEvent<HTMLFormElement>) => {
    const message = dirty
      ? "Restore this earlier version? Your unsaved changes will be lost. The current content is kept in the history."
      : "Restore this earlier version? The current content is kept in the history.";
    if (!window.confirm(message)) event.preventDefault();
  };

  const err = (key: string) => errors[key];

  return (
    <div>
      <div aria-live="polite" className="mt-6 empty:hidden">
        <StatusMessage status={state.status} publicHref={props.publicHref} />
      </div>

      {errorKeys.length > 0 && (
        <div
          ref={summaryRef}
          tabIndex={-1}
          role="alert"
          className="mt-4 rounded-md border border-accent bg-surface-2 px-4 py-3 outline-none focus-visible:ring-2"
        >
          <p className="type-body-sm text-fg">Please fix the following before saving:</p>
          <ul className="mt-2 flex list-disc flex-col gap-1 pl-5 type-body-sm">
            {errorKeys.map((key) => (
              <li key={key}>
                {key === "form" ? (
                  <span className="text-fg">{errors[key]}</span>
                ) : (
                  <a href={`#${fieldId(key)}`} className="text-fg underline underline-offset-4">
                    {errorLabel(key)}: {errors[key]}
                  </a>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <form key={state.nonce} action={formAction} onChange={changed} noValidate>
        <input type="hidden" name="version" value={state.version} />
        <input type="hidden" name="intent" value="save" />

        <Section
          title="Event details"
          description="Copy official wording only. Leave a field empty to show TBA / Coming Soon on the site."
        >
          <TextAreaField
            id={fieldId("description")}
            name="description"
            label="Description"
            rows={6}
            hint="Separate paragraphs with a blank line."
            defaultValue={values.description}
            error={err("description")}
          />
          <TextAreaField
            id={fieldId("rules")}
            name="rules"
            label="Rules"
            rows={6}
            hint="One rule per line."
            defaultValue={values.rules}
            error={err("rules")}
          />
          <TextAreaField
            id={fieldId("eligibility")}
            name="eligibility"
            label="Eligibility"
            rows={4}
            hint="Separate paragraphs with a blank line."
            defaultValue={values.eligibility}
            error={err("eligibility")}
          />
          <SelectField
            id={fieldId("participation")}
            name="participation"
            label="Participation"
            hint="Only as the official source states it — never guessed from the team size."
            options={PARTICIPATION}
            defaultValue={values.participation}
            error={err("participation")}
          />
        </Section>

        <Section title="Date, venue and entry">
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField
              id={fieldId("date")}
              name="date"
              label="Date"
              maxLength={props.limits.short}
              hint="Official wording, e.g. 12 Feb 2027."
              defaultValue={values.date}
              error={err("date")}
            />
            <TextField
              id={fieldId("time")}
              name="time"
              label="Time"
              maxLength={props.limits.short}
              defaultValue={values.time}
              error={err("time")}
            />
            <TextField
              id={fieldId("venue")}
              name="venue"
              label="Venue"
              maxLength={props.limits.venue}
              defaultValue={values.venue}
              error={err("venue")}
            />
            <TextField
              id={fieldId("teamSize")}
              name="teamSize"
              label="Team size"
              maxLength={props.limits.short}
              hint="e.g. 2–4 members"
              defaultValue={values.teamSize}
              error={err("teamSize")}
            />
            <TextField
              id={fieldId("registrationFee")}
              name="registrationFee"
              label="Registration fee"
              maxLength={props.limits.short}
              defaultValue={values.registrationFee}
              error={err("registrationFee")}
            />
          </div>
        </Section>

        <Section
          title="Registration"
          description="Participation is through departmental shortlisting. “Register Now” appears only when the status is Open and the link is an official Google Form."
        >
          <SelectField
            id={fieldId("registrationStatus")}
            name="registrationStatus"
            label="Registration status"
            options={STATUS}
            defaultValue={values.registrationStatus}
            error={err("registrationStatus")}
          />
          <TextField
            id={fieldId("registrationUrl")}
            name="registrationUrl"
            type="url"
            label="Google Form link"
            maxLength={props.limits.url}
            placeholder="https://forms.gle/…"
            hint="Only https://docs.google.com/forms/… or https://forms.gle/… links are accepted."
            defaultValue={values.registrationUrl}
            error={err("registrationUrl")}
          />
          <TextField
            id={fieldId("registrationDeadline")}
            name="registrationDeadline"
            label="Registration deadline"
            maxLength={props.limits.short}
            hint="Shown only while registration is open. Nothing closes automatically."
            defaultValue={values.registrationDeadline}
            error={err("registrationDeadline")}
          />
        </Section>

        <Section title="Guidelines and image">
          <TextField
            id={fieldId("guidelinesUrl")}
            name="guidelinesUrl"
            label="Guidelines PDF link"
            maxLength={props.limits.url}
            placeholder="https://… or /docs/…"
            hint="An https:// link or a /docs/… path to the official PDF. Uploading files arrives with the file manager."
            defaultValue={values.guidelinesUrl}
            error={err("guidelinesUrl")}
          />
          <dl className="grid gap-3 type-body-sm sm:grid-cols-2">
            <div className="rounded-md border border-line-subtle px-3 py-2">
              <dt className="type-meta text-fg-muted">Uploaded guidelines file</dt>
              <dd className="text-fg">
                {props.managed.guidelinesFile ? "Attached (file manager)" : "None"}
              </dd>
            </div>
            <div className="rounded-md border border-line-subtle px-3 py-2">
              <dt className="type-meta text-fg-muted">Event image</dt>
              <dd className="text-fg">
                {props.managed.image
                  ? "Set (file manager)"
                  : "None — the site shows abstract artwork"}
              </dd>
            </div>
          </dl>
        </Section>

        <Section
          title="Coordinators"
          description="Only official names and contact details. Empty rows are ignored."
        >
          {errors.coordinators && <p className="type-body-sm text-fg">{errors.coordinators}</p>}
          {rows.length === 0 && (
            <p className="type-body-sm text-fg-muted">
              No coordinators — the site shows “Coordinator details will be announced.”
            </p>
          )}
          <ol className="flex flex-col gap-4">
            {rows.map((row, i) => (
              <li key={row.id} className="rounded-lg border border-line-subtle p-4">
                <p className="type-meta text-fg-muted">Coordinator {i + 1}</p>
                <div className="mt-2 grid gap-4 sm:grid-cols-2">
                  {(
                    [
                      ["name", "coordinatorName", "Name", "text"],
                      ["designation", "coordinatorDesignation", "Designation", "text"],
                      ["phone", "coordinatorPhone", "Phone", "tel"],
                      ["email", "coordinatorEmail", "Email", "email"],
                    ] as const
                  ).map(([field, name, label, type]) => {
                    const id = fieldId(`coordinators.${i}.${field}`);
                    const error = err(`coordinators.${i}.${field}`);
                    const hint = field === "phone" ? "e.g. +91 98765 43210" : undefined;
                    return (
                      <div key={field}>
                        <label htmlFor={id} className="type-label text-fg-secondary">
                          {label}
                        </label>
                        {hint && (
                          <p id={`${id}-hint`} className="mt-1 type-meta text-fg-muted">
                            {hint}
                          </p>
                        )}
                        <input
                          id={id}
                          name={name}
                          type={type}
                          value={row[field]}
                          maxLength={props.limits.short}
                          onChange={(e) => updateRow(row.id, field, e.target.value)}
                          aria-invalid={error ? true : undefined}
                          aria-describedby={describedBy(id, hint, error)}
                          className={`${controlClass} h-12 ${error ? "border-accent" : "border-line-control"}`}
                        />
                        {error && (
                          <p id={`${id}-error`} className="mt-1.5 type-body-sm text-fg">
                            {error}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={i === 0}
                    onClick={() => {
                      moveRow(i, -1);
                      changed();
                    }}
                    className="h-11 rounded-md border border-line-control px-3 type-meta text-fg disabled:opacity-50"
                  >
                    Move up<span className="sr-only">: coordinator {i + 1}</span>
                  </button>
                  <button
                    type="button"
                    disabled={i === rows.length - 1}
                    onClick={() => {
                      moveRow(i, 1);
                      changed();
                    }}
                    className="h-11 rounded-md border border-line-control px-3 type-meta text-fg disabled:opacity-50"
                  >
                    Move down<span className="sr-only">: coordinator {i + 1}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRows((c) => c.filter((r) => r.id !== row.id));
                      changed();
                    }}
                    className="h-11 rounded-md border border-line-control px-3 type-meta text-fg"
                  >
                    Remove<span className="sr-only"> coordinator {i + 1}</span>
                  </button>
                </div>
              </li>
            ))}
          </ol>
          <button
            type="button"
            disabled={rows.length >= props.limits.coordinators}
            onClick={() => {
              setRows((c) => [
                ...c,
                { name: "", designation: "", phone: "", email: "", id: crypto.randomUUID() },
              ]);
              changed();
            }}
            className="h-11 w-fit rounded-md border border-line-control px-4 type-button text-fg hover:border-accent/55 disabled:opacity-50"
          >
            Add coordinator
          </button>
        </Section>

        <Section
          title="Source of this information"
          description="Required as soon as any detail is entered: where the official information came from."
        >
          <SelectField
            id={fieldId("sourceKind")}
            name="sourceKind"
            label="Source type"
            required
            options={SOURCE_KIND}
            defaultValue={values.sourceKind}
            error={err("sourceKind")}
          />
          <TextField
            id={fieldId("sourceReference")}
            name="sourceReference"
            label="Source reference"
            required
            maxLength={props.limits.sourceReference}
            hint="File name, form title, or who confirmed it."
            defaultValue={values.sourceReference}
            error={err("sourceReference")}
          />
          <TextField
            id={fieldId("sourceDate")}
            name="sourceDate"
            type="date"
            label="Date received"
            required
            defaultValue={values.sourceDate}
            error={err("sourceDate")}
          />
        </Section>

        <div className="sticky bottom-0 mt-8 flex flex-wrap items-center gap-4 border-t border-line-subtle bg-base/95 py-4">
          <button
            type="submit"
            disabled={pending || !dirty}
            className="h-12 rounded-md bg-accent-strong px-6 type-button text-on-accent hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "Saving…" : "Save changes"}
          </button>
          <span className="type-meta text-fg-muted" aria-live="polite">
            {pending ? "Saving…" : dirty ? "Unsaved changes" : "No unsaved changes"}
          </span>
        </div>
      </form>

      <section aria-labelledby="history-title" className="mt-12">
        <h2 id="history-title" className="type-title text-fg">
          Version history
        </h2>
        <p className="mt-1 type-body-sm text-fg-muted">
          Every save keeps the previous version. Restoring a version saves it as the current
          content.
        </p>
        {revisions.length === 0 ? (
          <p className="mt-3 type-body-sm text-fg-muted">No earlier versions yet.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {revisions.map((revision) => (
              <li
                key={revision.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-surface px-4 py-2"
              >
                <span className="type-body-sm text-fg">
                  {revision.savedLabel}
                  <span className="text-fg-muted">
                    {" · "}
                    {revision.hasContent ? `venue: ${revision.venue ?? "TBA"}` : "all TBA"}
                    {" · "}registration {revision.status}
                    {" · "}
                    {revision.coordinators} coordinator{revision.coordinators === 1 ? "" : "s"}
                  </span>
                </span>
                <form action={formAction} onSubmit={confirmRestore}>
                  <input type="hidden" name="intent" value="restore" />
                  <input type="hidden" name="version" value={state.version} />
                  <input type="hidden" name="revisionId" value={revision.id} />
                  <button
                    type="submit"
                    disabled={pending}
                    className="h-11 rounded-md border border-line-control px-3 type-meta text-fg hover:border-accent/55 disabled:opacity-50"
                  >
                    Restore<span className="sr-only"> the version saved {revision.savedLabel}</span>
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function StatusMessage({
  status,
  publicHref,
}: {
  status: EditorState["status"];
  publicHref: string;
}) {
  const box = "rounded-md border px-4 py-3 type-body-sm";
  switch (status) {
    case "saved":
    case "restored":
      return (
        <p role="status" className={`${box} border-line bg-surface text-fg`}>
          {status === "saved" ? "Saved." : "Earlier version restored and saved."} The public event
          page shows it on its next visit.{" "}
          <a
            href={publicHref}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-4"
          >
            View public page<span className="sr-only"> (opens in new tab)</span>
          </a>
        </p>
      );
    case "conflict":
      return (
        <p role="alert" className={`${box} border-accent bg-surface-2 text-fg`}>
          This event was changed in another tab or session, so nothing was saved. Your edits are
          still in the form — copy anything you need, then{" "}
          <a href="" className="underline underline-offset-4">
            reload the page
          </a>{" "}
          to see the latest version.
        </p>
      );
    case "error":
      return (
        <p role="alert" className={`${box} border-accent bg-surface-2 text-fg`}>
          Could not save — nothing was changed. Check the connection and try again.
        </p>
      );
    case "missing":
      return (
        <p role="alert" className={`${box} border-accent bg-surface-2 text-fg`}>
          This event has no CMS record yet, so it cannot be saved. Run <code>npm run cms:seed</code>
          , then reload.
        </p>
      );
    default:
      return null;
  }
}
