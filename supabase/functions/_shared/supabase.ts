import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2";

export function createUserClient(req: Request): SupabaseClient {
  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const jwt = req.headers.get("Authorization") ?? "";
  return createClient(url, anon, {
    global: { headers: { Authorization: jwt } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function createServiceClient(): SupabaseClient {
  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
