// Synthetic auth email so Supabase auth can use IC + password as credentials.
// The user's real (contact) email is stored separately in profiles.email.
export const IC_EMAIL_DOMAIN = "bidders.auction.local";

export function icToAuthEmail(ic: string): string {
  return `${ic}@${IC_EMAIL_DOMAIN}`;
}

export function normalizeIc(raw: string): string {
  return raw.replace(/[^0-9]/g, "").slice(0, 12);
}

export function isValidIc(ic: string): boolean {
  return /^[0-9]{12}$/.test(ic);
}
