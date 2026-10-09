import { AlertCircle } from "lucide-react";
import type { ReactNode } from "react";

/**
 * Admin form primitives (Phase 10.3). Deliberately plain and built from the existing tokens.
 * Errors use the brand accent border plus an icon and text (the design system defines no error
 * palette — docs/design-system/colors.md), so they never rely on colour alone.
 */

export const controlClass =
  "mt-1.5 block w-full rounded-md border bg-base px-3 py-2.5 type-body text-fg disabled:opacity-60";
const border = (invalid: boolean) => (invalid ? "border-accent" : "border-line-control");

interface FieldProps {
  id: string;
  label: string;
  hint?: ReactNode;
  error?: string;
  /** Marks the field as needed in the label (it is validated on the server either way). */
  required?: boolean;
}

export const describedBy = (id: string, hint?: ReactNode, error?: string) =>
  [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(" ") || undefined;

function Chrome({
  id,
  label,
  hint,
  error,
  required,
  children,
}: FieldProps & { children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="type-label text-fg-secondary">
        {label}
        {required && <span className="text-fg-muted normal-case"> (required with any detail)</span>}
      </label>
      {hint && (
        <p id={`${id}-hint`} className="mt-1 type-meta text-fg-muted">
          {hint}
        </p>
      )}
      {children}
      {error && (
        <p id={`${id}-error`} className="mt-1.5 flex items-start gap-1.5 type-body-sm text-fg">
          <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0 text-accent" />
          {error}
        </p>
      )}
    </div>
  );
}

export function TextField({
  name,
  defaultValue,
  maxLength,
  type = "text",
  placeholder,
  ...field
}: FieldProps & {
  name: string;
  defaultValue: string;
  maxLength?: number;
  type?: "text" | "url" | "date" | "email" | "tel";
  placeholder?: string;
}) {
  return (
    <Chrome {...field}>
      <input
        id={field.id}
        name={name}
        type={type}
        defaultValue={defaultValue}
        maxLength={maxLength}
        placeholder={placeholder}
        aria-invalid={field.error ? true : undefined}
        aria-describedby={describedBy(field.id, field.hint, field.error)}
        className={`${controlClass} h-12 ${border(Boolean(field.error))}`}
      />
    </Chrome>
  );
}

export function TextAreaField({
  name,
  defaultValue,
  rows = 5,
  ...field
}: FieldProps & { name: string; defaultValue: string; rows?: number }) {
  return (
    <Chrome {...field}>
      <textarea
        id={field.id}
        name={name}
        rows={rows}
        defaultValue={defaultValue}
        aria-invalid={field.error ? true : undefined}
        aria-describedby={describedBy(field.id, field.hint, field.error)}
        className={`${controlClass} ${border(Boolean(field.error))}`}
      />
    </Chrome>
  );
}

export function SelectField({
  name,
  defaultValue,
  options,
  ...field
}: FieldProps & {
  name: string;
  defaultValue: string;
  options: readonly { value: string; label: string }[];
}) {
  return (
    <Chrome {...field}>
      <select
        id={field.id}
        name={name}
        defaultValue={defaultValue}
        aria-invalid={field.error ? true : undefined}
        aria-describedby={describedBy(field.id, field.hint, field.error)}
        className={`${controlClass} h-12 ${border(Boolean(field.error))}`}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </Chrome>
  );
}

export function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: ReactNode;
  children: ReactNode;
}) {
  return (
    <fieldset className="mt-8 rounded-xl border border-line bg-surface p-5 sm:p-6">
      <legend className="px-1 type-title text-fg">{title}</legend>
      {description && <p className="type-body-sm text-fg-muted">{description}</p>}
      <div className="mt-4 flex flex-col gap-5">{children}</div>
    </fieldset>
  );
}
