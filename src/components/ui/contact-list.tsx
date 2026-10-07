import { Mail, MessageCircle, Phone, type LucideIcon } from "lucide-react";
import { IconTile } from "@/components/ui/icon-tile";
import { contact } from "@/data/festival";
import { contactHref, type ContactKind } from "@/lib/contact";
import { TBA, fact } from "@/lib/display";

/** Contact rows, in display order. Values come from data; unknown values render as TBA. */
const rows: readonly {
  kind: ContactKind;
  icon: LucideIcon;
  label: string;
  value: string | null;
}[] = [
  { kind: "phone", icon: Phone, label: "Phone", value: contact.phone },
  { kind: "whatsapp", icon: MessageCircle, label: "WhatsApp", value: contact.whatsapp },
  { kind: "email", icon: Mail, label: "Email", value: contact.email },
];

/**
 * Festival contact details.
 * - `compact`: footer column (icon + value).
 * - `cards`: Contact page (icon tile, value, visible label).
 * The label is always available to screen readers ("Phone: TBA"). Official values become
 * tel: / WhatsApp / mailto: links; TBA stays plain text.
 */
export function ContactList({ variant }: { variant: "compact" | "cards" }) {
  if (variant === "compact") {
    return (
      <ul className="flex flex-col gap-1">
        {rows.map(({ kind, icon: Icon, label, value }) => (
          <li key={label} className="flex min-h-8 items-center gap-3 type-body-sm text-fg-muted">
            <Icon aria-hidden className="size-[18px] shrink-0" />
            <span className="sr-only">{label}: </span>
            <ContactValue
              kind={kind}
              value={value}
              linkClassName="transition-colors hover:text-fg"
            />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <ul className="grid gap-3 sm:grid-cols-3">
      {rows.map(({ kind, icon, label, value }) => (
        <li
          key={label}
          className="flex items-center gap-4 rounded-lg border border-line bg-surface p-5"
        >
          <IconTile icon={icon} />
          <span className="flex flex-col">
            <span
              className={`type-chip-value ${fact(value) === TBA ? "text-fg-muted" : "text-fg"}`}
            >
              <span className="sr-only">{label}: </span>
              <ContactValue
                kind={kind}
                value={value}
                linkClassName="hover:underline hover:underline-offset-4"
              />
            </span>
            <span aria-hidden className="type-chip-label text-fg-muted">
              {label}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}

/** The value as a link when it is an official, linkable value; otherwise plain text (TBA). */
function ContactValue({
  kind,
  value,
  linkClassName,
}: {
  kind: ContactKind;
  value: string | null;
  linkClassName: string;
}) {
  const text = fact(value);
  const href = contactHref(kind, value);
  if (!href) return <>{text}</>;

  if (kind === "whatsapp") {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={linkClassName}>
        {text}
        <span className="sr-only"> (opens WhatsApp in a new tab)</span>
      </a>
    );
  }
  return (
    <a href={href} className={linkClassName}>
      {text}
    </a>
  );
}
