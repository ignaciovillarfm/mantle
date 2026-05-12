import { createClient } from "@supabase/supabase-js";
import { getSupabasePublishableUrl } from "@/lib/supabase/normalizeUrl";

/** Service role — server-only. Never import from client components. */
export function createServiceRoleClient() {
  const url = getSupabasePublishableUrl();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key?.trim()) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient(url, key.trim(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
