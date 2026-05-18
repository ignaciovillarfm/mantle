import type { NextRequest } from "next/server";

function originFromEnvValue(raw: string | undefined): string | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    return new URL(withScheme).origin;
  } catch {
    return null;
  }
}

function originFromRequestHeaders(headers: Headers): string | null {
  const host = headers.get("x-forwarded-host") ?? headers.get("host");
  if (!host) return null;
  const hostname = host.split(",")[0]?.trim();
  if (!hostname) return null;
  const proto = (headers.get("x-forwarded-proto") ?? "https").split(",")[0]?.trim() || "https";
  try {
    return new URL(`${proto}://${hostname}`).origin;
  } catch {
    return null;
  }
}

/**
 * Base origin for server redirects. `new URL(path, base)` throws if `base` is
 * invalid (empty env, missing scheme) — that surfaced as HTTP 500 on /auth/callback.
 */
export function getPublicOrigin(request: NextRequest): string {
  return (
    originFromEnvValue(process.env.NEXT_PUBLIC_SITE_URL) ?? request.nextUrl.origin
  );
}

/**
 * Canonical app URL for links shared with others (invites, copy-to-clipboard).
 * Prefers server-only SITE_URL so local dev can still OAuth on localhost while
 * pointing invitees to production. Falls back to the current request host on Vercel.
 */
export function getShareableSiteOrigin(headers: Headers): string {
  return (
    originFromEnvValue(process.env.SITE_URL) ??
    originFromRequestHeaders(headers) ??
    originFromEnvValue(process.env.NEXT_PUBLIC_SITE_URL) ??
    ""
  );
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
