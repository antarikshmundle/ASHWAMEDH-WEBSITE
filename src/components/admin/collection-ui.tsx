"use client";

import { AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { SourceFields } from "@/types/admin-collections";
import { SelectField, TextField } from "./fields";

/** Shared pieces of the Gallery and Team managers (Phase 10.6). */

export type Outcome = { ok: true } | { ok: false; error: string; errors?: Record<string, string> };

export const SOURCE_OPTIONS = [
  { value: "", label: "Choose…" },
  { value: "official-pdf", label: "Official PDF" },
  { value: "official-form", label: "Official Google Form" },
  { value: "owner-confirmed", label: "Confirmed by the organisers" },
] as const;
export const STATUS_OPTIONS = [
  { value: "draft", label: "Draft — not shown on the site" },
  { value: "published", label: "Published — shown on the site" },
] as const;

export const formObject = (form: HTMLFormElement) =>
  Object.fromEntries([...new FormData(form).entries()].filter(([, v]) => typeof v === "string"));

/** Runs an action, keeps its errors, refreshes the page data after a success. */
export function useCollectionAction() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [result, setResult] = useState<Outcome | null>(null);
  const run = (action: () => Promise<Outcome>, after?: () => void) =>
    start(async () => {
      try {
        const outcome = await action();
        setResult(outcome);
        if (outcome.ok) {
          after?.();
          router.refresh();
        }
      } catch {
        setResult({
          ok: false,
          error: "Something went wrong. Check the connection and try again.",
        });
      }
    });
  return { pending, result, run, errors: result && !result.ok ? (result.errors ?? {}) : {} };
}

export function SourceInputs({
  idPrefix,
  values,
  errors,
}: {
  idPrefix: string;
  values: SourceFields;
  errors: Record<string, string>;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <SelectField
        id={`${idPrefix}-sourceKind`}
        name="sourceKind"
        label="Source type"
        options={SOURCE_OPTIONS}
        defaultValue={values.sourceKind}
        error={errors.sourceKind}
      />
      <TextField
        id={`${idPrefix}-sourceReference`}
        name="sourceReference"
        label="Source reference"
        maxLength={200}
        defaultValue={values.sourceReference}
        error={errors.sourceReference}
      />
      <TextField
        id={`${idPrefix}-sourceDate`}
        name="sourceDate"
        type="date"
        label="Date received"
        defaultValue={values.sourceDate}
        error={errors.sourceDate}
      />
    </div>
  );
}

export function ResultMessage({ result, success }: { result: Outcome | null; success: string }) {
  if (!result) return null;
  return result.ok ? (
    <p role="status" className="type-body-sm text-fg">
      {success}
    </p>
  ) : (
    <p role="alert" className="flex items-start gap-1.5 type-body-sm text-fg">
      <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0 text-accent" />
      {result.error}
    </p>
  );
}

export const secondaryButton =
  "h-11 rounded-md border border-line-control px-3 type-meta text-fg hover:border-accent/55 disabled:cursor-not-allowed disabled:opacity-50";
export const primaryButton =
  "h-11 rounded-md bg-accent-strong px-4 type-button text-on-accent hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60";

/** Move up / Move down / Delete for one row; the order is saved for the whole list at once. */
export function RowControls({
  label,
  index,
  count,
  disabled,
  onMove,
  onDelete,
}: {
  label: string;
  index: number;
  count: number;
  disabled: boolean;
  onMove: (by: -1 | 1) => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        disabled={disabled || index === 0}
        onClick={() => onMove(-1)}
        className={secondaryButton}
      >
        Move up<span className="sr-only">: {label}</span>
      </button>
      <button
        type="button"
        disabled={disabled || index === count - 1}
        onClick={() => onMove(1)}
        className={secondaryButton}
      >
        Move down<span className="sr-only">: {label}</span>
      </button>
      <button type="button" disabled={disabled} onClick={onDelete} className={secondaryButton}>
        Delete<span className="sr-only">: {label}</span>
      </button>
    </div>
  );
}

export const moved = (ids: string[], index: number, by: -1 | 1) => {
  const next = [...ids];
  const [id] = next.splice(index, 1);
  next.splice(index + by, 0, id!);
  return next;
};
