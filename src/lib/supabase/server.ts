import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabasePublishableUrl } from "@/lib/supabase/normalizeUrl";

export async function createClient() {
  const cookieStore = await cookies();
  const url = getSupabasePublishableUrl();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!key?.trim()) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  return createServerClient(url, key.trim(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: object }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options as never),
          );
        } catch {
          /* set from Server Component — ignore */
        }
      },
    },
  });
}
