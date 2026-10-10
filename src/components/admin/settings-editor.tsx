"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { saveSettingsAction, type SettingsState } from "@/app/admin/settings/actions";
import { scheduleRows } from "@/data/festival";
import { Section, SelectField, TextField, controlClass, describedBy } from "./fields";

/**
 * Festival settings editor (Phase 10.5): contact details, social links, Cultural Night dates,
 * schedule times / venues, vertical taglines and their official source. The Server Action
 * re-checks the session and validates everything; this component only guides.
 */

type Values = NonNullable<SettingsState["values"]>;
type Link = Values["socialLinks"][number] & { id: string };

export interface SettingsLimits {
  date: number;
  time: number;
  venue: number;
  tagline: number;
  label: number;
  href: number;
  links: number;
  reference: number;
}

const SOURCE_KIND = [
  { value: "", label: "Choose…" },
  { value: "official-pdf", label: "Official PDF" },
  { value: "official-form", label: "Official Google Form" },
  { value: "owner-confirmed", label: "Confirmed by the organisers" },
] as const;
const TAGLINES = [
  ["technomedh", "Technomedh"],
  ["cultural", "Cultural"],
  ["sports", "Sports"],
  ["cultural-night", "Cultural Night"],
] as const;
const fieldId = (key: string) => `s-${key.replace(/\./g, "-")}`;
const withIds = (links: Values["socialLinks"], nonce: number): Link[] =>
  links.map((link, i) => ({ ...link, id: `${nonce}-${i}` }));

export function SettingsEditor(props: {
  initialValues: Values;
  initialVersion: string;
  limits: SettingsLimits;
}) {
  const [state, formAction, pending] = useActionState(saveSettingsAction, {
    status: "idle",
    version: props.initialVersion,
    nonce: 0,
    values: props.initialValues,
  } satisfies SettingsState);
  const values = state.values ?? props.initialValues;
  const errors = state.errors ?? {};
  const err = (key: string) => errors[key];

  const [seen, setSeen] = useState(state.nonce);
  const [links, setLinks] = useState(() => withIds(values.socialLinks, state.nonce));
  const [dirty, setDirty] = useState(false);
  if (seen !== state.nonce) {
    setSeen(state.nonce);
    setLinks(withIds(values.socialLinks, state.nonce));
    if (state.status === "saved") setDirty(false);
  }

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const summaryRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (state.status === "invalid") summaryRef.current?.focus();
  }, [state.nonce, state.status]);

  const errorKeys = Object.keys(errors);
  const box = "rounded-md border px-4 py-3 type-body-sm";

  return (
    <div>
      <div aria-live="polite" className="mt-6 empty:hidden">
        {state.status === "saved" && (
          <p role="status" className={`${box} border-line bg-surface text-fg`}>
            Saved. Pages that show these details update on their next visit.
          </p>
        )}
        {state.status === "conflict" && (
          <p role="alert" className={`${box} border-accent bg-surface-2 text-fg`}>
            The settings were changed in another tab or session, so nothing was saved. Your edits
            are still in the form — copy anything you need, then{" "}
            <a href="" className="underline underline-offset-4">
              reload the page
            </a>
            .
          </p>
        )}
        {(state.status === "error" || state.status === "missing") && (
          <p role="alert" className={`${box} border-accent bg-surface-2 text-fg`}>
            Could not save — nothing was changed. Check the connection and try again.
          </p>
        )}
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
                <a href={`#${fieldId(key)}`} className="text-fg underline underline-offset-4">
                  {errors[key]}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      <form key={state.nonce} action={formAction} onChange={() => setDirty(true)} noValidate>
        <input type="hidden" name="version" value={state.version} />

        <div id="contact">
          <Section
            title="Contact"
            description="Official contact details only. Empty fields show TBA on the Contact page and in the footer."
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <TextField
                id={fieldId("contactPhone")}
                name="contactPhone"
                type="tel"
                label="Phone"
                maxLength={30}
                hint="e.g. +91 98765 43210"
                defaultValue={values.contactPhone}
                error={err("contactPhone")}
              />
              <TextField
                id={fieldId("contactWhatsapp")}
                name="contactWhatsapp"
                type="tel"
                label="WhatsApp"
                maxLength={30}
                hint="International format with +, e.g. +91 98765 43210."
                defaultValue={values.contactWhatsapp}
                error={err("contactWhatsapp")}
              />
              <TextField
                id={fieldId("contactEmail")}
                name="contactEmail"
                type="email"
                label="Email"
                maxLength={254}
                defaultValue={values.contactEmail}
                error={err("contactEmail")}
              />
            </div>
          </Section>
        </div>

        <div id="social">
          <Section
            title="Social links"
            description="Official accounts only (https:// links). The footer shows nothing while this list is empty."
          >
            {err("socialLinks") && <p className="type-body-sm text-fg">{err("socialLinks")}</p>}
            {links.length === 0 && (
              <p className="type-body-sm text-fg-muted">No social links — none are shown.</p>
            )}
            <ol className="flex flex-col gap-4">
              {links.map((link, i) => (
                <li key={link.id} className="rounded-lg border border-line-subtle p-4">
                  <p className="type-meta text-fg-muted">Link {i + 1}</p>
                  <div className="mt-2 grid gap-4 sm:grid-cols-[12rem_1fr]">
                    {(
                      [
                        ["label", "socialLabel", "Label", "text", props.limits.label],
                        ["href", "socialHref", "Link (https://…)", "url", props.limits.href],
                      ] as const
                    ).map(([field, name, label, type, max]) => {
                      const id = fieldId(`social.${i}.${field}`);
                      const error = err(`social.${i}.${field}`);
                      return (
                        <div key={field}>
                          <label htmlFor={id} className="type-label text-fg-secondary">
                            {label}
                          </label>
                          <input
                            id={id}
                            name={name}
                            type={type}
                            value={link[field]}
                            maxLength={max}
                            onChange={(e) =>
                              setLinks((all) =>
                                all.map((l) =>
                                  l.id === link.id ? { ...l, [field]: e.target.value } : l,
                                ),
                              )
                            }
                            aria-invalid={error ? true : undefined}
                            aria-describedby={describedBy(id, undefined, error)}
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
                  <button
                    type="button"
                    onClick={() => {
                      setLinks((all) => all.filter((l) => l.id !== link.id));
                      setDirty(true);
                    }}
                    className="mt-3 h-11 rounded-md border border-line-control px-3 type-meta text-fg"
                  >
                    Remove<span className="sr-only"> link {i + 1}</span>
                  </button>
                </li>
              ))}
            </ol>
            <button
              type="button"
              disabled={links.length >= props.limits.links}
              onClick={() => {
                setLinks((all) => [...all, { label: "", href: "", id: crypto.randomUUID() }]);
                setDirty(true);
              }}
              className="h-11 w-fit rounded-md border border-line-control px-4 type-button text-fg hover:border-accent/55 disabled:opacity-50"
            >
              Add link
            </button>
          </Section>
        </div>

        <div id="cultural-night">
          <Section
            title="Cultural Night"
            description="Official dates only, in the official wording. Empty shows TBA."
          >
            <div className="grid gap-5 sm:grid-cols-2">
              {(
                [
                  ["culturalNightDay1", "Day 1 date"],
                  ["culturalNightDay2", "Day 2 date"],
                ] as const
              ).map(([name, label]) => (
                <TextField
                  key={name}
                  id={fieldId(name)}
                  name={name}
                  label={label}
                  maxLength={props.limits.date}
                  hint="e.g. 12 Feb 2027"
                  defaultValue={values[name]}
                  error={err(name)}
                />
              ))}
            </div>
          </Section>
        </div>

        <div id="schedule">
          <Section
            title="Schedule"
            description="Time and venue of each schedule row. Row titles are fixed. Empty shows TBA. Day tabs appear only once the official days are confirmed."
          >
            <div className="flex flex-col gap-4">
              {scheduleRows.map((row) => (
                <fieldset key={row.key} className="rounded-lg border border-line-subtle p-4">
                  <legend className="px-1 type-label text-fg">{row.title}</legend>
                  <div className="grid gap-4 sm:grid-cols-[12rem_1fr]">
                    <TextField
                      id={fieldId(`schedule.${row.key}.time`)}
                      name={`schedule.${row.key}.time`}
                      label="Time"
                      maxLength={props.limits.time}
                      defaultValue={values.schedule[row.key].time}
                      error={err(`schedule.${row.key}.time`)}
                    />
                    <TextField
                      id={fieldId(`schedule.${row.key}.venue`)}
                      name={`schedule.${row.key}.venue`}
                      label="Venue"
                      maxLength={props.limits.venue}
                      defaultValue={values.schedule[row.key].venue}
                      error={err(`schedule.${row.key}.venue`)}
                    />
                  </div>
                </fieldset>
              ))}
            </div>
          </Section>
        </div>

        <div id="taglines">
          <Section
            title="Taglines"
            description="Only officially approved taglines. Empty keeps the current placeholder."
          >
            <div className="grid gap-5 sm:grid-cols-2">
              {TAGLINES.map(([key, label]) => (
                <TextField
                  key={key}
                  id={fieldId(`tagline.${key}`)}
                  name={`tagline.${key}`}
                  label={label}
                  maxLength={props.limits.tagline}
                  defaultValue={values.taglines[key]}
                  error={err(`tagline.${key}`)}
                />
              ))}
            </div>
          </Section>
        </div>

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
            maxLength={props.limits.reference}
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
    </div>
  );
}
