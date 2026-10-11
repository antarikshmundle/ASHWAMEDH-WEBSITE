"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useId, useRef, useState } from "react";
import {
  deleteGalleryItemAction,
  finalizeGalleryUploadAction,
  reorderGalleryAction,
  requestGalleryUploadAction,
  saveGalleryItemAction,
} from "@/app/admin/gallery/actions";
import type { AdminGalleryItemView } from "@/types/admin-collections";
import {
  ResultMessage,
  RowControls,
  STATUS_OPTIONS,
  SourceInputs,
  formObject,
  moved,
  primaryButton,
  useCollectionAction,
  type Outcome,
} from "./collection-ui";
import { Section, SelectField, TextField } from "./fields";
import { sendFile } from "./send-file";

/**
 * Gallery manager (Phase 10.6): upload through the 10.4 pipeline (signed staging upload, server
 * validation), then caption, alt text, status and source per image. New images start as Draft.
 */

const EMPTY = { sourceKind: "", sourceReference: "", sourceDate: "" };
const CAPTION_HINT =
  "What and when, as officially stated. For a previous edition, include the edition / year (e.g. ASHWAMEDH 2025).";

function ItemFields({
  idPrefix,
  values,
  errors,
  withStatus,
}: {
  idPrefix: string;
  values: { caption: string; altText: string; status: string };
  errors: Record<string, string>;
  withStatus: boolean;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <TextField
        id={`${idPrefix}-caption`}
        name="caption"
        label="Caption"
        maxLength={200}
        hint={CAPTION_HINT}
        defaultValue={values.caption}
        error={errors.caption}
      />
      <TextField
        id={`${idPrefix}-alt`}
        name="altText"
        label="Alt text (optional)"
        maxLength={300}
        hint="Describe the image only if the caption does not; empty = decorative."
        defaultValue={values.altText}
        error={errors.altText}
      />
      {withStatus && (
        <SelectField
          id={`${idPrefix}-status`}
          name="status"
          label="Status"
          options={STATUS_OPTIONS}
          defaultValue={values.status}
          error={errors.status}
        />
      )}
    </div>
  );
}

function Upload({ maxBytes, types }: { maxBytes: number; types: string[] }) {
  const router = useRouter();
  const fileId = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const [phase, setPhase] = useState<"idle" | "preparing" | "uploading" | "checking">("idle");
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<Outcome | null>(null);
  const busy = phase !== "idle";
  const errors = result && !result.ok ? (result.errors ?? {}) : {};
  const stop = (outcome: Outcome) => {
    setPhase("idle");
    setProgress(0);
    setResult(outcome);
  };

  async function upload(form: HTMLFormElement) {
    const file = (form.elements.namedItem("file") as HTMLInputElement).files?.[0];
    if (!file)
      return stop({
        ok: false,
        error: "Choose an image file.",
        errors: { file: "Choose an image file." },
      });
    if (!types.includes(file.type) || file.size === 0 || file.size > maxBytes)
      return stop({
        ok: false,
        error: "Use a JPEG, PNG or WebP image up to 5 MB.",
        errors: { file: "Use a JPEG, PNG or WebP image up to 5 MB." },
      });
    const fields = formObject(form);
    setResult(null);
    setPhase("preparing");
    try {
      const ticket = await requestGalleryUploadAction({
        filename: file.name,
        type: file.type,
        size: file.size,
      });
      if (!ticket.ok) return stop({ ok: false, error: ticket.error });
      setPhase("uploading");
      if (!(await sendFile(ticket.uploadUrl, file, ticket.contentType, setProgress)))
        return stop({
          ok: false,
          error: "The upload did not complete. Check the connection and try again.",
        });
      setPhase("checking");
      const done = await finalizeGalleryUploadAction({ ticketId: ticket.ticketId, ...fields });
      if (!done.ok) return stop({ ok: false, error: done.error });
      form.reset();
      stop({ ok: true });
      router.refresh();
    } catch {
      stop({ ok: false, error: "Something went wrong. Check the connection and try again." });
    }
  }

  return (
    <form
      ref={formRef}
      onSubmit={(event) => {
        event.preventDefault();
        void upload(event.currentTarget);
      }}
      aria-busy={busy || undefined}
      className="flex flex-col gap-4"
      noValidate
    >
      <div>
        <label htmlFor={fileId} className="type-label text-fg-secondary">
          Image
        </label>
        <p id={`${fileId}-hint`} className="mt-1 type-meta text-fg-muted">
          JPEG, PNG or WebP, up to 5 MB, at most 4096 pixels per side and 16 megapixels. Official
          imagery only.
        </p>
        <input
          id={fileId}
          name="file"
          type="file"
          accept={types.join(",")}
          disabled={busy}
          aria-invalid={errors.file ? true : undefined}
          aria-describedby={`${fileId}-hint${errors.file ? ` ${fileId}-error` : ""}`}
          className="mt-1.5 block w-full type-body-sm text-fg file:mr-3 file:h-11 file:rounded-md file:border file:border-line-control file:bg-surface-2 file:px-4 file:text-fg"
        />
        {errors.file && (
          <p id={`${fileId}-error`} className="mt-1.5 type-body-sm text-fg">
            {errors.file}
          </p>
        )}
      </div>
      <ItemFields
        idPrefix="new"
        values={{ caption: "", altText: "", status: "draft" }}
        errors={errors}
        withStatus={false}
      />
      <SourceInputs idPrefix="new" values={EMPTY} errors={errors} />
      <div className="flex flex-wrap items-center gap-4" aria-live="polite">
        <button type="submit" disabled={busy} className={primaryButton}>
          {busy ? "Uploading…" : "Upload image"}
        </button>
        {phase === "preparing" && (
          <span className="type-body-sm text-fg">Preparing the upload…</span>
        )}
        {phase === "checking" && <span className="type-body-sm text-fg">Checking the image…</span>}
        {!busy && <ResultMessage result={result} success="Image uploaded as a draft." />}
      </div>
      {phase === "uploading" && (
        <div
          role="progressbar"
          aria-label="Uploading image"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
          aria-valuetext={`${progress}%`}
          className="h-2 w-full overflow-hidden rounded-full bg-surface-2"
        >
          <div className="h-full bg-accent-strong" style={{ width: `${progress}%` }} />
        </div>
      )}
    </form>
  );
}

function ItemRow({
  item,
  index,
  order,
}: {
  item: AdminGalleryItemView;
  index: number;
  order: string[];
}) {
  const { pending, result, run, errors } = useCollectionAction();
  const label = `image ${index + 1}`;
  return (
    <li className="rounded-lg border border-line-subtle p-4">
      <div className="flex flex-wrap items-start gap-4">
        <div className="relative h-24 w-36 shrink-0 overflow-hidden rounded-md border border-line-subtle bg-surface-2">
          {item.url && (
            <Image
              src={item.url}
              alt={`Gallery image ${index + 1}: ${item.caption}`}
              fill
              sizes="144px"
              className="object-cover"
            />
          )}
        </div>
        <p className="type-meta text-fg-muted">
          {index + 1}. {item.status === "published" ? "Published" : "Draft"}
        </p>
      </div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const form = event.currentTarget;
          run(() => saveGalleryItemAction(item.id, item.version, formObject(form)));
        }}
        className="mt-3 flex flex-col gap-4"
        noValidate
      >
        <ItemFields idPrefix={`g-${item.id}`} values={item} errors={errors} withStatus />
        <SourceInputs idPrefix={`g-${item.id}`} values={item} errors={errors} />
        <div className="flex flex-wrap items-center gap-4" aria-live="polite">
          <button type="submit" disabled={pending} className={primaryButton}>
            Save<span className="sr-only">: {label}</span>
          </button>
          <ResultMessage result={result} success="Saved." />
        </div>
      </form>
      <div className="mt-3">
        <RowControls
          label={label}
          index={index}
          count={order.length}
          disabled={pending}
          onMove={(by) => run(() => reorderGalleryAction(moved(order, index, by)))}
          onDelete={() => {
            if (
              window.confirm(
                `Delete ${label}? It disappears from the site; the file is removed after 24 hours.`,
              )
            )
              run(() => deleteGalleryItemAction(item.id, item.version));
          }}
        />
      </div>
    </li>
  );
}

export function GalleryManager({
  items,
  maxBytes,
  types,
}: {
  items: AdminGalleryItemView[];
  maxBytes: number;
  types: string[];
}) {
  const order = items.map((i) => i.id);
  return (
    <div>
      <Section
        title="Upload an image"
        description="It is added as a Draft; publish it below once caption and source are checked."
      >
        <Upload maxBytes={maxBytes} types={types} />
      </Section>
      <section aria-labelledby="images-title" className="mt-10">
        <h2 id="images-title" className="type-title text-fg">
          Images ({items.length})
        </h2>
        <p className="mt-1 type-body-sm text-fg-muted">
          Published images appear on the Gallery page in this order. With none published, it shows
          “Gallery coming soon.”
        </p>
        {items.length === 0 ? (
          <p className="mt-4 type-body-sm text-fg-muted">No images yet.</p>
        ) : (
          <ol className="mt-4 flex flex-col gap-4">
            {items.map((item, i) => (
              <ItemRow key={`${item.id}-${item.version}`} item={item} index={i} order={order} />
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
