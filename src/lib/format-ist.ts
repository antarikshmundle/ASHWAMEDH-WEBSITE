const IST = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Kolkata",
});

/** A database timestamp shown in Indian time (admin UI), or "—" when missing or unreadable. */
export function formatIst(value: string | null | undefined): string {
  if (!value) return "—";
  // PostgreSQL text ("2026-10-09 10:00:00.12+00") or ISO ("2026-10-09T10:00:00.12+00:00").
  const date = new Date(value.replace(" ", "T").replace(/([+-]\d{2})$/, "$1:00"));
  return Number.isNaN(date.getTime()) ? "—" : `${IST.format(date)} IST`;
}
