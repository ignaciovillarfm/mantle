import type { SupabaseClient } from "@supabase/supabase-js";

export type WardInviteRole = "bishop" | "counselor" | "clerk";

export const WARD_INVITE_ROLES: WardInviteRole[] = ["bishop", "counselor", "clerk"];

export function normalizeInviteEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function wardRoleLabel(role: string, lang: "en" | "es" = "en"): string {
  const labels: Record<string, { en: string; es: string }> = {
    bishop: { en: "Bishop", es: "Obispo" },
    counselor: { en: "Counselor", es: "Consejero" },
    clerk: { en: "Clerk", es: "Secretario" },
  };
  const row = labels[role];
  if (!row) return role;
  return row[lang];
}

export type AcceptInvitesResult = {
  createdProfile: boolean;
  acceptedCount: number;
};

/** Fulfill pending invites for this email (service role). Idempotent per invite. */
export async function acceptPendingWardInvites(
  admin: SupabaseClient,
  userId: string,
  rawEmail: string | null | undefined,
): Promise<AcceptInvitesResult> {
  const email = rawEmail ? normalizeInviteEmail(rawEmail) : "";
  if (!email) return { createdProfile: false, acceptedCount: 0 };

  const now = new Date().toISOString();

  const { data: profile } = await admin
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .maybeSingle();

  let createdProfile = false;
  if (!profile) {
    const { error: insErr } = await admin.from("profiles").insert({
      id: userId,
      email,
      session_version: 1,
    });
    if (insErr) throw insErr;
    createdProfile = true;
  }

  const { data: invites, error: invErr } = await admin
    .from("ward_invites")
    .select("id, ward_id, role, email")
    .eq("status", "pending")
    .gt("expires_at", now)
    .eq("email", email);
  if (invErr) throw invErr;

  let acceptedCount = 0;
  for (const inv of invites ?? []) {
    const { data: existingRoles } = await admin
      .from("user_roles")
      .select("id")
      .eq("user_id", userId)
      .eq("ward_id", inv.ward_id as string);
    if ((existingRoles ?? []).length > 0) {
      await admin
        .from("ward_invites")
        .update({
          status: "accepted",
          accepted_at: now,
          accepted_by: userId,
        })
        .eq("id", inv.id as string)
        .eq("status", "pending");
      acceptedCount += 1;
      continue;
    }

    const { error: roleErr } = await admin.from("user_roles").insert({
      user_id: userId,
      ward_id: inv.ward_id as string,
      role: inv.role as string,
    });
    if (roleErr) {
      console.error("[acceptPendingWardInvites] role insert", roleErr);
      continue;
    }

    const { error: upErr } = await admin
      .from("ward_invites")
      .update({
        status: "accepted",
        accepted_at: now,
        accepted_by: userId,
      })
      .eq("id", inv.id as string)
      .eq("status", "pending");
    if (upErr) throw upErr;
    acceptedCount += 1;
  }

  return { createdProfile, acceptedCount };
}
