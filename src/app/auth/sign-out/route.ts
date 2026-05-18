import { getPublicOrigin } from "@/lib/publicOrigin";
import { getSupabasePublishableUrl } from "@/lib/supabase/normalizeUrl";
import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = "ward_session_sig";

async function signOutAndRedirect(request: NextRequest) {
  const origin = getPublicOrigin(request);
  const loginUrl = new URL("/login", origin);
  loginUrl.searchParams.set("signed_out", "1");

  const response = NextResponse.redirect(loginUrl);

  const url = getSupabasePublishableUrl();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!key) {
    response.cookies.delete(SESSION_COOKIE);
    return response;
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: object }[]) {
        cookiesToSet.forEach(({ name, value, options }) => {
          if (value === "" || value === undefined) {
            response.cookies.delete(name);
          } else {
            response.cookies.set(name, value, options as never);
          }
        });
      },
    },
  });

  await supabase.auth.signOut();
  response.cookies.delete(SESSION_COOKIE);

  return response;
}

export async function POST(request: NextRequest) {
  return signOutAndRedirect(request);
}

export async function GET(request: NextRequest) {
  return signOutAndRedirect(request);
}
