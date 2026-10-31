import { SettingsClient } from "./SettingsClient";
import { loadProgramTemplatesForWard } from "@/lib/sacrament/loadProgramTemplates";
import { fetchUserWardRoles } from "@/lib/serverRoles";
import { createClient } from "@/lib/supabase/server";
import { userDisplayNameFromAuth } from "@/lib/userDisplayName";
import { WARD_INVITE_ROLES, wardRoleLabel } from "@/lib/wardInvites";
import { getShareableSiteOrigin } from "@/lib/publicOrigin";
import { headers } from "next/headers";
import { Suspense } from "react";

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

  const firstLeadershipWardId = leadershipWards[0]?.wardId ?? null;
  let programTemplatesInitial: {
    wardId: string;
    defaults: Awaited<ReturnType<typeof loadProgramTemplatesForWard>>["defaults"];
    templates: Awaited<ReturnType<typeof loadProgramTemplatesForWard>>["templates"];
  } | null = null;
  if (firstLeadershipWardId) {
    try {
      const loaded = await loadProgramTemplatesForWard(firstLeadershipWardId);
      programTemplatesInitial = {
        wardId: firstLeadershipWardId,
        defaults: loaded.defaults,
        templates: loaded.templates,
      };
    } catch {
      programTemplatesInitial = null;
    }
  }

  return (
    <Suspense
      fallback={
        <div className="rounded-xl border border-border bg-surface p-6 text-sm text-foreground/60">
          Loading settings…
        </div>
      }
    >
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
        programTemplatesInitial={programTemplatesInitial}
      />
    </Suspense>
  );
}
