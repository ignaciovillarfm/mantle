/**
 * Supabase JS expects the **project URL** (https://<ref>.supabase.co), not the
 * PostgREST base (…/rest/v1/). Using /rest/v1/ breaks Auth and yields
 * "No API key found in request" from the gateway.
 */
export function normalizeSupabaseUrl(raw: string): string {
  const trimmed = raw.trim();
  try {
    const u = new URL(
      /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`,
    );
    if (u.hostname.endsWith(".supabase.co")) {
      return `${u.protocol}//${u.host}`.replace(/\/$/, "");
    }
  } catch {
    /* fall through */
  }
  return trimmed
    .replace(/\/rest\/v1\/?$/i, "")
    .replace(/\/+$/, "");
}

export function getSupabasePublishableUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!raw) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
  return normalizeSupabaseUrl(raw);
}
