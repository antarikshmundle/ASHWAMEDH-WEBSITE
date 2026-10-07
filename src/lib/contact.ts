export type ContactKind = "phone" | "whatsapp" | "email";

/**
 * Link target for an official contact value, or `null` when the value is missing or not in a
 * linkable format (it then renders as plain text). Nothing is guessed: WhatsApp links need the
 * number in international format ("+91 …"); no country code is ever added.
 */
export function contactHref(kind: ContactKind, value: string | null): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;

  if (kind === "email") {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed) ? `mailto:${trimmed}` : null;
  }

  const number = trimmed.replace(/[\s\-().]/g, "");
  if (kind === "phone") return /^\+?\d{6,15}$/.test(number) ? `tel:${number}` : null;
  return /^\+\d{8,15}$/.test(number) ? `https://wa.me/${number.slice(1)}` : null;
}
