import { sendWardInviteEmail } from "@/lib/email/wardInviteEmail";
import { assertWardLeadership } from "@/lib/serverRoles";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { normalizeInviteEmail, WARD_INVITE_ROLES, type WardInviteRole } from "@/lib/wardInvites";
import { createClient } from "@/lib/supabase/server";

export type CreateWardInviteResult = {
  id: string;
  expires_at: string;
  emailSent: boolean;
  emailError?: string;
};

export async function assertCanManageWardInvites(wardId: string): Promise<void> {
  await assertWardLeadership(wardId);
}

export async function listWardInvites(wardId: string) {
  await assertCanManageWardInvites(wardId);
  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("ward_invites")
    .select("id, email, role, status, expires_at, created_at, accepted_at")
    .eq("ward_id", wardId)
    .in("status", ["pending", "accepted", "revoked"])
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createWardInvite(
  wardId: string,
  rawEmail: string,
  role: string,
  options: { loginOrigin: string },
): Promise<CreateWardInviteResult> {
  await assertCanManageWardInvites(wardId);
  if (!WARD_INVITE_ROLES.includes(role as WardInviteRole)) {
    throw new Error("role must be bishop, counselor, or clerk");
  }
  const email = normalizeInviteEmail(rawEmail);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Valid email required");
  }

  const admin = createServiceRoleClient();

  const { data: existingProfile } = await admin
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();
  if (existingProfile) {
    const { data: existingRole } = await admin
      .from("user_roles")
      .select("id")
      .eq("user_id", existingProfile.id)
      .eq("ward_id", wardId)
      .maybeSingle();
    if (existingRole) {
      throw new Error("This person already has access to this ward");
    }
  }

  const { data: pending } = await admin
    .from("ward_invites")
    .select("id")
    .eq("ward_id", wardId)
    .eq("status", "pending")
    .eq("email", email)
    .maybeSingle();
  if (pending) {
    throw new Error("A pending invite already exists for this email");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: invite, error } = await admin
    .from("ward_invites")
    .insert({
      ward_id: wardId,
      email,
      role,
      invited_by: user.id,
      status: "pending",
    })
    .select("id, expires_at")
    .single();
  if (error) throw new Error(error.message);

  const { data: ward } = await admin
    .from("wards")
    .select("name")
    .eq("id", wardId)
    .maybeSingle();
  const wardName = (ward?.name as string | undefined)?.trim() || "Ward";
  const loginOrigin = options.loginOrigin.replace(/\/$/, "");
  const loginUrl = `${loginOrigin}/login`;

  const emailResult = await sendWardInviteEmail({
    to: email,
    wardName,
    role,
    loginUrl,
    expiresAt: invite.expires_at as string,
  });

  return {
    id: invite.id as string,
    expires_at: invite.expires_at as string,
    emailSent: emailResult.sent,
    emailError:
      emailResult.sent
        ? undefined
        : emailResult.reason === "not_configured"
          ? "Email is not configured (set RESEND_API_KEY and RESEND_FROM_EMAIL)"
          : emailResult.detail ?? "Failed to send email",
  };
}

export async function revokeWardInvite(inviteId: string): Promise<void> {
  const admin = createServiceRoleClient();
  const { data: invite, error: invErr } = await admin
    .from("ward_invites")
    .select("id, ward_id, status")
    .eq("id", inviteId)
    .maybeSingle();
  if (invErr || !invite) throw new Error("Invite not found");
  if (invite.status !== "pending") {
    throw new Error("Only pending invites can be revoked");
  }

  await assertCanManageWardInvites(invite.ward_id as string);

  const { error: upErr } = await admin
    .from("ward_invites")
    .update({ status: "revoked" })
    .eq("id", inviteId)
    .eq("status", "pending");
  if (upErr) throw new Error(upErr.message);
}
