import { SettingsClient } from "./SettingsClient";
import { fetchUserWardRoles } from "@/lib/serverRoles";
import { createClient } from "@/lib/supabase/server";
import { userDisplayNameFromAuth } from "@/lib/userDisplayName";
import { WARD_INVITE_ROLES, wardRoleLabel } from "@/lib/wardInvites";
import { getShareableSiteOrigin } from "@/lib/publicOrigin";
import { headers } from "next/headers";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="rounded-xl border border-border bg-surface p-6 text-foreground/70">
        Please sign in to view settings.
      </div>
    );
  }

  const wardRoles = await fetchUserWardRoles();
  const { data: profile } = await supabase
    .from("profiles")
    .select("email, session_version, created_at")
    .eq("id", user.id)
    .maybeSingle();

  const leadershipWards = wardRoles
    .filter((r) => WARD_INVITE_ROLES.includes(r.role as (typeof WARD_INVITE_ROLES)[number]))
    .map((r) => ({
      wardId: r.ward_id,
      wardName: r.wards?.name?.trim() || "Ward",
      role: r.role,
    }));

  const hdrs = await headers();
  const siteOrigin = getShareableSiteOrigin(hdrs);

  const avatarUrl =
    typeof user.user_metadata?.avatar_url === "string"
      ? user.user_metadata.avatar_url
      : null;

  return (
    <SettingsClient
      displayName={userDisplayNameFromAuth(user)}
      email={profile?.email ?? user.email ?? ""}
      avatarUrl={avatarUrl}
      oauthEmail={user.email ?? ""}
      wardRoles={wardRoles.map((r) => ({
        wardId: r.ward_id,
        wardName: r.wards?.name?.trim() || "Ward",
        role: r.role,
        roleLabel: wardRoleLabel(r.role, "en"),
      }))}
      leadershipWards={leadershipWards}
      siteOrigin={siteOrigin}
      isBishop={wardRoles.some((r) => r.role === "bishop")}
    />
  );
}
