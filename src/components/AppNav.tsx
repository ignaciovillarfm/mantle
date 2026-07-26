import { MantleLogo } from "@/components/MantleLogo";
import { BishopricNavDropdown } from "@/components/BishopricNavDropdown";
import { fetchUserWardRoles } from "@/lib/serverRoles";
import { userDisplayNameFromAuth, userInitialsFromDisplayName } from "@/lib/userDisplayName";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

const links = [
  { href: "/members", label: "Members" },
  { href: "/calendar", label: "Calendar" },
  { href: "/sacrament", label: "Sacrament" },
  { href: "/callings", label: "Callings" },
];

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

  const displayName = user ? userDisplayNameFromAuth(user) : "";
  const avatarUrl =
    user && typeof user.user_metadata?.avatar_url === "string"
      ? user.user_metadata.avatar_url
      : typeof user?.user_metadata?.picture === "string"
        ? user.user_metadata.picture
        : null;

  return (
    <nav className="border-b border-border bg-surface/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl flex-col gap-2 px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="flex min-w-0 shrink-0 items-center gap-2 sm:max-w-[14rem]">
          <Link href="/bishopric/organization" className="shrink-0" aria-label="Mantle home">
            <MantleLogo variant="mark" />
          </Link>
          <span
            className="min-w-0 truncate text-sm font-semibold text-foreground"
            title={wardDisplayName}
          >
            {wardDisplayName}
          </span>
        </div>

        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1 sm:justify-center">
          <BishopricNavDropdown />
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

        <div className="relative z-20 flex shrink-0 items-center gap-2 sm:ml-auto">
          {user ? (
            <Link
              href="/settings"
              className="flex min-h-10 min-w-10 items-center gap-2 rounded-lg px-2 py-1.5 transition hover:bg-surface-hover"
              title={`${displayName} — account settings`}
              aria-label={`${displayName}, account settings`}
            >
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- OAuth URLs; avoid remotePatterns churn
                <img
                  src={avatarUrl}
                  alt=""
                  className="pointer-events-none h-8 w-8 shrink-0 rounded-full object-cover ring-1 ring-border"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span
                  className="pointer-events-none flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground ring-1 ring-border"
                  aria-hidden
                >
                  {userInitialsFromDisplayName(displayName)}
                </span>
              )}
              <span className="max-w-[8rem] truncate text-sm font-medium text-foreground sm:max-w-[10rem]">
                {displayName}
              </span>
            </Link>
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
