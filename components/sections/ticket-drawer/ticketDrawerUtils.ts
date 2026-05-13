"use client";

export function formatTicketDateTime(raw: string | undefined): string {
  const t = (raw ?? "").trim();
  if (!t) return "—";
  const normalized = /^\d{4}-\d{2}-\d{2} \d/.test(t) ? t.replace(" ", "T") : t;
  const d = new Date(normalized);
  if (Number.isNaN(d.getTime())) return t;
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
