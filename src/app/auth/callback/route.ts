import { createServerClient } from "@supabase/ssr";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { getPublicOrigin, safeInternalPath } from "@/lib/publicOrigin";
import { getSupabasePublishableUrl } from "@/lib/supabase/normalizeUrl";
import { type NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = "ward_session_sig";

export async function GET(request: NextRequest) {
  const origin = getPublicOrigin(request);
  const next = safeInternalPath(request.nextUrl.searchParams.get("next"));

  try {
    let url: string;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
    try {
      url = getSupabasePublishableUrl();
    } catch {
      return NextResponse.redirect(new URL("/login?error=config", origin));
    }
    if (!key) {
      return NextResponse.redirect(new URL("/login?error=config", origin));
    }

    const code = request.nextUrl.searchParams.get("code");
    if (!code) {
      return NextResponse.redirect(new URL("/login?error=no_code", origin));
    }

    const response = NextResponse.redirect(new URL(next, origin));

    const supabase = createServerClient(url, key, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: { name: string; value: string; options: object }[],
        ) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options as never),
          );
        },
      },
    });

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(error.message)}`, origin),
      );
    }

    const { data: authData } = await supabase.auth.getUser();
    const user = authData?.user;
    if (!user) {
      return NextResponse.redirect(new URL("/login?error=no_user", origin));
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("session_version")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile) {
      await supabase.auth.signOut();
      response.cookies.delete(SESSION_COOKIE);
      return NextResponse.redirect(
        new URL("/login?error=not_whitelisted", origin),
      );
    }

    const v = String(profile.session_version ?? 1);
    response.cookies.set(SESSION_COOKIE, v, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });

    try {
      const admin = createServiceRoleClient();
      await admin.from("audit_logs").insert({
        user_id: user.id,
        action: "login_success",
        table_name: "profiles",
        record_id: user.id,
      });
    } catch {
      /* audit optional if service role unset in dev */
    }

    return response;
  } catch (e) {
    console.error("[auth/callback]", e);
    return NextResponse.redirect(new URL("/login?error=oauth", origin));
  }
}
