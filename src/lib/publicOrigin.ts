import type { NextRequest } from "next/server";

/**
 * Base origin for server redirects. `new URL(path, base)` throws if `base` is
 * invalid (empty env, missing scheme) — that surfaced as HTTP 500 on /auth/callback.
 */
export function getPublicOrigin(request: NextRequest): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (raw) {
    const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    try {
      return new URL(withScheme).origin;
    } catch {
      /* fall through */
    }
  }
  return request.nextUrl.origin;
}

/** Only same-origin relative paths; avoids `//evil.com` open redirects. */
export function safeInternalPath(
  param: string | null,
  fallback = "/dashboard",
): string {
  if (!param || !param.startsWith("/") || param.startsWith("//")) {
    return fallback;
  }
  return param;
}
