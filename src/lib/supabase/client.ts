import { createBrowserClient } from "@supabase/ssr";
import { getSupabasePublishableUrl } from "@/lib/supabase/normalizeUrl";

export function createClient() {
  const url = getSupabasePublishableUrl();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!key?.trim()) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }
  return createBrowserClient(url, key.trim());
}
