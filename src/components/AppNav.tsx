import { MantleLogo } from "@/components/MantleLogo";
import { BishopricNavDropdown } from "@/components/BishopricNavDropdown";
import { UserNavMenu } from "@/components/UserNavMenu";
import { fetchUserWardRoles } from "@/lib/serverRoles";
import { userDisplayNameFromAuth } from "@/lib/userDisplayName";
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
    <nav className="sticky top-0 z-40 border-b border-border bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/80">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center">
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
          {user ? <UserNavMenu displayName={displayName} avatarUrl={avatarUrl} /> : null}
        </div>
      </div>
    </nav>
  );
}
