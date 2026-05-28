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
