import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getSupabasePublishableUrl } from "@/lib/supabase/normalizeUrl";

const SESSION_COOKIE = "ward_session_sig";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  let url: string;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  try {
    url = getSupabasePublishableUrl();
  } catch {
    return response;
  }
  if (!key) {
    return response;
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: object }[]) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options as never),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthRoute =
    request.nextUrl.pathname.startsWith("/login") ||
    request.nextUrl.pathname.startsWith("/auth");

  const isProtected =
    request.nextUrl.pathname.startsWith("/dashboard") ||
    request.nextUrl.pathname.startsWith("/leadership") ||
    request.nextUrl.pathname.startsWith("/members") ||
    request.nextUrl.pathname.startsWith("/api/members") ||
    request.nextUrl.pathname.startsWith("/api/callings") ||
    request.nextUrl.pathname.startsWith("/api/sacrament") ||
    request.nextUrl.pathname.startsWith("/sacrament") ||
    request.nextUrl.pathname.startsWith("/callings") ||
    request.nextUrl.pathname.startsWith("/recommends") ||
    request.nextUrl.pathname.startsWith("/admin") ||
    request.nextUrl.pathname.startsWith("/bishop-notes");

  if (isProtected && !user) {
    const redirect = new URL("/login", request.url);
    redirect.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(redirect);
  }

  if (user && isProtected) {
    let profile: { session_version: number | null } | null = null;
    try {
      const { data } = await supabase
        .from("profiles")
        .select("session_version")
        .eq("id", user.id)
        .maybeSingle();
      profile = data;
    } catch {
      return NextResponse.redirect(new URL("/login?error=server", request.url));
    }

    if (!profile) {
      await supabase.auth.signOut();
      response.cookies.delete(SESSION_COOKIE);
      return NextResponse.redirect(new URL("/login?error=not_whitelisted", request.url));
    }

    const expected = String(profile.session_version ?? 1);
    const cookieVersion = request.cookies.get(SESSION_COOKIE)?.value;

    if (!cookieVersion) {
      response.cookies.set(SESSION_COOKIE, expected, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
      });
      return response;
    }

    if (cookieVersion !== expected) {
      await supabase.auth.signOut();
      response.cookies.delete(SESSION_COOKIE);
      return NextResponse.redirect(new URL("/login?error=session_stale", request.url));
    }
  }

  if (user && isAuthRoute && request.nextUrl.pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
