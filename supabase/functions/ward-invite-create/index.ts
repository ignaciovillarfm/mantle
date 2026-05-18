import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders, errorResponse, jsonResponse } from "../_shared/http.ts";
import { createServiceClient, createUserClient } from "../_shared/supabase.ts";
import { getUserWardRoles, requireUser } from "../_shared/authz.ts";
import { writeAudit } from "../_shared/audit.ts";
import { rateLimitUser } from "../_shared/rateLimit.ts";

const LEADERSHIP = new Set(["bishop", "counselor", "clerk"]);
const ROLES = new Set(["bishop", "counselor", "clerk"]);

type Body = { ward_id?: string; email?: string; role?: string };

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }

  try {
    const userSb = createUserClient(req);
    const actor = await requireUser(userSb);
    if (!rateLimitUser(actor.id)) {
      return errorResponse("Rate limit exceeded", 429);
    }

    const body = (await req.json()) as Body;
    const wardId = body.ward_id?.trim();
    const email = body.email ? normalizeEmail(body.email) : "";
    const role = body.role?.trim();

    if (!wardId) return errorResponse("ward_id required", 400);
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return errorResponse("Valid email required", 400);
    }
    if (!role || !ROLES.has(role)) {
      return errorResponse("role must be bishop, counselor, or clerk", 400);
    }

    const actorWards = await getUserWardRoles(userSb, actor.id);
    if (!actorWards.some((r) => r.ward_id === wardId && LEADERSHIP.has(r.role))) {
      return errorResponse("Forbidden", 403);
    }

    const service = createServiceClient();

    const { data: existingProfile } = await service
      .from("profiles")
      .select("id")
      .ilike("email", email)
      .maybeSingle();
    if (existingProfile) {
      const { data: existingRole } = await service
        .from("user_roles")
        .select("id")
        .eq("user_id", existingProfile.id)
        .eq("ward_id", wardId)
        .maybeSingle();
      if (existingRole) {
        return errorResponse("This person already has access to this ward", 409);
      }
    }

    const { data: pending } = await service
      .from("ward_invites")
      .select("id")
      .eq("ward_id", wardId)
      .eq("status", "pending")
      .ilike("email", email)
      .maybeSingle();
    if (pending) {
      return errorResponse("A pending invite already exists for this email", 409);
    }

    const { data: invite, error: insErr } = await service
      .from("ward_invites")
      .insert({
        ward_id: wardId,
        email,
        role,
        invited_by: actor.id,
        status: "pending",
      })
      .select("id, token, expires_at, created_at")
      .single();
    if (insErr) throw insErr;

    await writeAudit(service, {
      user_id: actor.id,
      action: "ward_invite_create",
      table_name: "ward_invites",
      record_id: invite.id as string,
      ward_id: wardId,
    });

    return jsonResponse({
      ok: true,
      invite: {
        id: invite.id,
        token: invite.token,
        expires_at: invite.expires_at,
        created_at: invite.created_at,
      },
    });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error(e);
    return errorResponse("Internal error", 500);
  }
});
