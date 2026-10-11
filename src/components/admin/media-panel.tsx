"use client";

import { AlertCircle } from "lucide-react";
import Image from "next/image";
import { useId, useRef, useState } from "react";
import {
  finalizeMediaUploadAction,
  removeEventMediaAction,
  requestMediaUploadAction,
  updateEventImageAltAction,
} from "@/app/admin/events/media-actions";
import type { MediaFileSummary } from "@/types/admin-media";
import { controlClass } from "./fields";
import { sendFile } from "./send-file";

/**
 * One media slot of the event editor (Phase 10.4.5): the event image or the guidelines PDF.
 * Upload = ticket (Server Action) → the browser sends the file straight to private staging with
 * the signed URL (progress shown) → finalize (Server Action: the server validates the stored
 * bytes, publishes and links them). Remove only unlinks (the file is kept for 24 hours and stays
 * in the version history). Every step is checked again on the server; this component only guides.
 */

export type MediaKind = "image" | "guidelines";

interface Props {
  slug: string;
  kind: MediaKind;
  file: MediaFileSummary | null;
  /** A path / link used instead of an upload (image_path or guidelines_url); an upload replaces it. */
  linked: string | null;
  version: string;
  /** Why changes are not possible right now (shown and announced), or null. */
  blockedReason: string | null;
  maxBytes: number;
  types: readonly string[];
  onBusyChange: (busy: boolean) => void;
  onDone: (message: string) => void;
}

const COPY = {
  image: {
    title: "Event image",
    noun: "image",
    aNoun: "an image",
    none: "No image — the public site shows the abstract artwork.",
    accept: "JPEG, PNG or WebP",
    hint: "Up to 4096 pixels per side and 16 megapixels.",
    uploaded: "Image uploaded. The event page and listings show it on their next visit.",
    removed: "Image removed. The public site shows the abstract artwork again.",
    removeConfirm:
      "Remove the event image? The public site will show the abstract artwork. The file is kept for 24 hours and stays in the version history.",
  },
  guidelines: {
    title: "Guidelines PDF",
    noun: "PDF",
    aNoun: "a PDF",
    none: "No PDF — the public page shows “Guidelines PDF Coming Soon”.",
    accept: "PDF",
    hint: "The official guidelines document only.",
    uploaded: "Guidelines PDF uploaded. The event page links it on its next visit.",
    removed: "Guidelines PDF removed. The public page shows “Guidelines PDF Coming Soon”.",
    removeConfirm:
      "Remove the guidelines PDF? The public page will show “Guidelines PDF Coming Soon”. The file is kept for 24 hours and stays in the version history.",
  },
} as const;

const ALT_MAX = 300;
const formatSize = (bytes: number) =>
  bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;

type Phase = "idle" | "preparing" | "uploading" | "checking" | "removing" | "saving-alt";
const PHASE_TEXT: Record<Exclude<Phase, "idle">, string> = {
  preparing: "Preparing the upload…",
  uploading: "Uploading…",
  checking: "Checking and publishing the file…",
  removing: "Removing…",
  "saving-alt": "Saving the alt text…",
};

export function MediaPanel(props: Props) {
  const copy = COPY[props.kind];
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [selected, setSelected] = useState<File | null>(null);
  const [alt, setAlt] = useState("");
  const [currentAlt, setCurrentAlt] = useState(props.file?.altText ?? "");
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const busy = phase !== "idle";
  const blocked = props.blockedReason !== null;
  const hasCurrent = Boolean(props.file || props.linked);
  const ids = {
    title: `${id}-title`,
    input: `${id}-file`,
    hint: `${id}-hint`,
    blocked: `${id}-blocked`,
    error: `${id}-error`,
    alt: `${id}-alt`,
    altHint: `${id}-alt-hint`,
    currentAlt: `${id}-current-alt`,
  };
  const describe = (...extra: (string | false | null)[]) =>
    [blocked && ids.blocked, ...extra].filter(Boolean).join(" ") || undefined;

  const start = (next: Phase) => {
    setError(null);
    setPhase(next);
    props.onBusyChange(true);
  };
  const stop = (message: string | null, done?: string) => {
    setPhase("idle");
    setProgress(0);
    props.onBusyChange(false);
    if (message) setError(message);
    if (done) props.onDone(done);
  };

  function choose(file: File | null) {
    setError(null);
    setSelected(null);
    if (!file) return;
    if (!props.types.includes(file.type)) {
      setError(`This file is not a ${copy.accept} file.`);
    } else if (file.size === 0) {
      setError("This file is empty.");
    } else if (file.size > props.maxBytes) {
      setError(`This file is larger than ${formatSize(props.maxBytes)}.`);
    } else {
      setSelected(file);
    }
  }

  async function upload() {
    if (!selected || busy || blocked) return;
    if (hasCurrent) {
      const what = props.file
        ? `the current ${copy.noun} (${props.file.name})`
        : "the current link";
      const ok = window.confirm(
        `Replace ${what} with ${selected.name}? The previous one stays in the version history.`,
      );
      if (!ok) return;
    }
    start("preparing");
    try {
      const ticket = await requestMediaUploadAction(props.slug, {
        kind: props.kind,
        filename: selected.name,
        type: selected.type,
        size: selected.size,
        version: props.version,
      });
      if (!ticket.ok) return stop(ticket.error);
      setPhase("uploading");
      const sent = await sendFile(ticket.uploadUrl, selected, ticket.contentType, setProgress);
      if (!sent) return stop("The upload did not complete. Check the connection and try again.");
      setPhase("checking");
      const done = await finalizeMediaUploadAction(props.slug, {
        kind: props.kind,
        ticketId: ticket.ticketId,
        version: props.version,
        altText: props.kind === "image" ? alt : null,
      });
      if (!done.ok) return stop(done.error);
      setSelected(null);
      setAlt("");
      if (inputRef.current) inputRef.current.value = "";
      stop(null, copy.uploaded);
    } catch {
      stop("Something went wrong. Check the connection, reload the page and try again.");
    }
  }

  async function remove() {
    if (busy || blocked || !props.file) return;
    if (!window.confirm(copy.removeConfirm)) return;
    start("removing");
    try {
      const done = await removeEventMediaAction(props.slug, {
        kind: props.kind,
        version: props.version,
      });
      if (!done.ok) return stop(done.error);
      stop(null, copy.removed);
    } catch {
      stop("Something went wrong. Check the connection, reload the page and try again.");
    }
  }

  async function saveAlt() {
    if (busy || blocked || !props.file) return;
    start("saving-alt");
    try {
      const done = await updateEventImageAltAction(props.slug, { altText: currentAlt });
      if (!done.ok) return stop(done.error);
      stop(
        null,
        currentAlt.trim() ? "Alt text saved." : "Alt text removed — the image is decorative.",
      );
    } catch {
      stop("Something went wrong. Check the connection, reload the page and try again.");
    }
  }

  const button =
    "h-11 rounded-md border border-line-control px-4 type-button text-fg hover:border-accent/55 disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <section
      aria-labelledby={ids.title}
      aria-busy={busy || undefined}
      className="rounded-lg border border-line-subtle p-4"
    >
      <h3 id={ids.title} className="type-label text-fg">
        {copy.title}
      </h3>

      {props.file ? (
        <div className="mt-3 flex flex-wrap gap-4">
          {props.kind === "image" && (
            <div className="relative h-32 w-48 shrink-0 overflow-hidden rounded-md border border-line-subtle bg-surface-2">
              <Image
                src={props.file.url}
                alt={
                  props.file.altText
                    ? `Current event image: ${props.file.altText}`
                    : "Current event image (no alt text)"
                }
                fill
                sizes="192px"
                className="object-contain"
              />
            </div>
          )}
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 type-body-sm">
            <dt className="text-fg-muted">File</dt>
            <dd className="break-all text-fg">{props.file.name}</dd>
            <dt className="text-fg-muted">Size</dt>
            <dd className="text-fg">{formatSize(props.file.sizeBytes)}</dd>
            {props.file.width && props.file.height && (
              <>
                <dt className="text-fg-muted">Dimensions</dt>
                <dd className="text-fg">
                  {props.file.width} × {props.file.height} px
                </dd>
              </>
            )}
            <dt className="text-fg-muted">Uploaded</dt>
            <dd className="text-fg">{props.file.uploadedLabel}</dd>
          </dl>
        </div>
      ) : (
        <p className="mt-2 type-body-sm text-fg-muted">
          {props.linked ? (
            <>
              Linked instead of uploaded: <code className="break-all">{props.linked}</code>.
              Uploading a file replaces this link (it stays in the version history).
            </>
          ) : (
            copy.none
          )}
        </p>
      )}

      {props.file?.url && props.kind === "guidelines" && (
        <a
          href={props.file.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex min-h-11 items-center type-body-sm text-fg underline underline-offset-4"
        >
          Open the current PDF<span className="sr-only"> (opens in new tab)</span>
        </a>
      )}

      {blocked && (
        <p id={ids.blocked} className="mt-3 type-body-sm text-fg">
          {props.blockedReason}
        </p>
      )}

      {props.kind === "image" && props.file && (
        <div className="mt-4">
          <label htmlFor={ids.currentAlt} className="type-label text-fg-secondary">
            Alt text of the current image
          </label>
          <p id={`${ids.currentAlt}-hint`} className="mt-1 type-meta text-fg-muted">
            Describe what the official image shows, in up to {ALT_MAX} characters. Leave empty if it
            is decorative.
          </p>
          <input
            id={ids.currentAlt}
            type="text"
            value={currentAlt}
            maxLength={ALT_MAX}
            disabled={busy || blocked}
            onChange={(e) => setCurrentAlt(e.target.value)}
            aria-describedby={describe(`${ids.currentAlt}-hint`)}
            className={`${controlClass} h-12 border-line-control`}
          />
          <button
            type="button"
            onClick={saveAlt}
            disabled={busy || blocked || currentAlt === (props.file.altText ?? "")}
            aria-describedby={describe()}
            className={`${button} mt-2`}
          >
            Save alt text
          </button>
        </div>
      )}

      <div className="mt-4">
        <label htmlFor={ids.input} className="type-label text-fg-secondary">
          {hasCurrent ? `Replace with a new ${copy.noun}` : `Upload ${copy.aNoun}`}
        </label>
        <p id={ids.hint} className="mt-1 type-meta text-fg-muted">
          {copy.accept}, up to {formatSize(props.maxBytes)}. {copy.hint}
        </p>
        <input
          ref={inputRef}
          id={ids.input}
          type="file"
          accept={props.types.join(",")}
          disabled={busy || blocked}
          onChange={(e) => choose(e.target.files?.[0] ?? null)}
          aria-invalid={error ? true : undefined}
          aria-describedby={describe(ids.hint, error && ids.error)}
          className="mt-1.5 block w-full type-body-sm text-fg file:mr-3 file:h-11 file:rounded-md file:border file:border-line-control file:bg-surface-2 file:px-4 file:text-fg disabled:opacity-60"
        />

        {props.kind === "image" && selected && (
          <div className="mt-3">
            <label htmlFor={ids.alt} className="type-label text-fg-secondary">
              Alt text for the new image (optional)
            </label>
            <p id={ids.altHint} className="mt-1 type-meta text-fg-muted">
              Only an official description; leave empty if the image is decorative.
            </p>
            <input
              id={ids.alt}
              type="text"
              value={alt}
              maxLength={ALT_MAX}
              disabled={busy}
              onChange={(e) => setAlt(e.target.value)}
              aria-describedby={ids.altHint}
              className={`${controlClass} h-12 border-line-control`}
            />
          </div>
        )}

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={upload}
            disabled={!selected || busy || blocked}
            aria-describedby={describe()}
            className="h-11 rounded-md bg-accent-strong px-4 type-button text-on-accent hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
          >
            {hasCurrent ? `Replace ${copy.noun}` : `Upload ${copy.noun}`}
          </button>
          {props.file && (
            <button
              type="button"
              onClick={remove}
              disabled={busy || blocked}
              aria-describedby={describe()}
              className={button}
            >
              Remove {copy.noun}
            </button>
          )}
        </div>
      </div>

      <div aria-live="polite" className="mt-3 empty:hidden">
        {busy && (
          <p className="type-body-sm text-fg">{PHASE_TEXT[phase as Exclude<Phase, "idle">]}</p>
        )}
      </div>
      {phase === "uploading" && (
        <div
          role="progressbar"
          aria-label={`Uploading ${copy.noun}`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
          aria-valuetext={`${progress}%`}
          className="mt-2 h-2 w-full overflow-hidden rounded-full bg-surface-2"
        >
          <div className="h-full bg-accent-strong" style={{ width: `${progress}%` }} />
        </div>
      )}
      {error && (
        <p
          id={ids.error}
          role="alert"
          className="mt-3 flex items-start gap-1.5 type-body-sm text-fg"
        >
          <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0 text-accent" />
          {error}
        </p>
      )}
    </section>
  );
}
