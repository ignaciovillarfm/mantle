import { fetchUserWardRoles } from "@/lib/serverRoles";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

const links = [
  { href: "/dashboard", label: "Organizations" },
  { href: "/members", label: "Members" },
  { href: "/sacrament", label: "Sacrament" },
  { href: "/callings", label: "Callings" },
];

function displayNameFromUser(user: {
  user_metadata?: Record<string, unknown>;
  email?: string | null;
}): string {
  const meta = user.user_metadata ?? {};
  const full =
    (typeof meta.full_name === "string" && meta.full_name) ||
    (typeof meta.name === "string" && meta.name) ||
    "";
  if (full.trim()) return full.trim();
  return user.email?.split("@")[0] ?? "Account";
}

function initialsFromDisplayName(displayName: string): string {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const a = parts[0][0];
    const b = parts[parts.length - 1][0];
    if (a && b) return (a + b).toUpperCase();
  }
  const s = displayName.trim().slice(0, 2);
  return (s || "?").toUpperCase();
}

export async function AppNav() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const wardRoles = user ? await fetchUserWardRoles() : [];
  const isBishop = wardRoles.some((r) => r.role === "bishop");

  const wardNameSet = Array.from(
    new Set(wardRoles.map((r) => r.wards?.name).filter((n): n is string => Boolean(n && n.trim()))),
  ).sort((a, b) => a.localeCompare(b));
  let wardDisplayName = wardNameSet[0] ?? "Ward";
  if (wardDisplayName === "Ward" && user && wardRoles.length > 0) {
    const firstId = wardRoles[0].ward_id;
    const { data: w } = await supabase.from("wards").select("name").eq("id", firstId).maybeSingle();
    if (w?.name) wardDisplayName = w.name;
  }

  const displayName = user ? displayNameFromUser(user) : "";
  const avatarUrl =
    user && typeof user.user_metadata?.avatar_url === "string"
      ? user.user_metadata.avatar_url
      : null;

  // #region agent log
  fetch("http://127.0.0.1:7702/ingest/bd06d274-2613-4711-9466-3b028482916a", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "812a29" },
    body: JSON.stringify({
      sessionId: "812a29",
      runId: "post-fix-nav",
      hypothesisId: "N1",
      location: "src/components/AppNav.tsx:getUserContext",
      message: "Loaded nav context auth user and ward roles",
      data: {
        hasUser: Boolean(user),
        userId: user?.id ?? null,
        userName: user?.user_metadata?.full_name ?? user?.email ?? null,
        wardRoleCount: wardRoles.length,
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion
  // #region agent log
  fetch("http://127.0.0.1:7702/ingest/bd06d274-2613-4711-9466-3b028482916a", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "812a29" },
    body: JSON.stringify({
      sessionId: "812a29",
      runId: "post-fix-nav",
      hypothesisId: "N2",
      location: "src/components/AppNav.tsx:rolesAndWardName",
      message: "Computed nav ward label and bishop flag",
      data: {
        isBishop,
        wardIds: wardRoles.map((w) => w.ward_id ?? null),
        wardNamesFromRoles: wardRoles.map((w) => w.wards?.name ?? null),
        wardDisplayName,
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion

  return (
    <nav className="border-b border-border bg-surface/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-2 px-4 py-3">
        <div className="order-1 min-w-0 max-w-[40%] shrink-0 text-sm font-semibold text-foreground sm:max-w-xs">
          <span className="block truncate" title={wardDisplayName}>
            {wardDisplayName}
          </span>
        </div>

        <div className="order-3 flex w-full flex-wrap items-center gap-2 sm:order-2 sm:flex-1 sm:justify-center md:w-auto">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-lg px-3 py-2 text-sm text-foreground/80 transition hover:bg-surface-hover hover:text-foreground"
            >
              {l.label}
            </Link>
          ))}
          {isBishop ? (
            <Link
              href="/bishop-notes"
              className="rounded-lg px-3 py-2 text-sm text-foreground/80 transition hover:bg-surface-hover hover:text-foreground"
            >
              Bishop notes
            </Link>
          ) : null}
        </div>

        <div className="order-2 ml-auto flex shrink-0 items-center gap-2 sm:order-3 sm:ml-0">
          {user ? (
            <>
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- OAuth URLs; avoid remotePatterns churn
                <img
                  src={avatarUrl}
                  alt=""
                  className="h-8 w-8 shrink-0 rounded-full object-cover ring-1 ring-border"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground ring-1 ring-border"
                  aria-hidden
                >
                  {initialsFromDisplayName(displayName)}
                </span>
              )}
              <span className="hidden max-w-40 truncate text-sm text-foreground/90 sm:inline" title={displayName}>
                {displayName}
              </span>
            </>
          ) : null}
          <form action="/auth/sign-out" method="post">
            <button
              type="submit"
              className="rounded-lg px-3 py-2 text-sm text-foreground/60 hover:text-foreground"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </nav>
  );
}
