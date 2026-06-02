export function formatRM(value: number | string | null | undefined): string {
  if (value == null) return "RM —";
  const n = typeof value === "string" ? Number(value) : value;
  return new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: "MYR",
    maximumFractionDigits: 0,
  }).format(n);
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-MY", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

/** "just now" / "12 sec ago" / "2 min ago" / "1 hr ago" / "3 days ago" */
export function timeAgo(iso: string, nowMs: number = Date.now()): string {
  const diff = Math.max(0, nowMs - new Date(iso).getTime());
  const s = Math.floor(diff / 1000);
  if (s < 5) return "just now";
  if (s < 60) return `${s} sec ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hr ago`;
  const d = Math.floor(h / 24);
  return `${d} day${d === 1 ? "" : "s"} ago`;
}

/** "Ahmad bin Rahman" -> "Ahmad R." */
export function shortName(full: string | null | undefined): string {
  if (!full) return "Bidder";
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "Bidder";
  if (parts.length === 1) return parts[0];
  const first = parts[0];
  const last = parts[parts.length - 1];
  return `${first} ${last[0].toUpperCase()}.`;
}

export const CATEGORIES = [
  "All",
  "Terrace",
  "Apartment",
  "Condominium",
  "Bungalow",
  "Semi-Detached",
  "Shop-Lot",
  "Land",
] as const;

export type Category = (typeof CATEGORIES)[number];
