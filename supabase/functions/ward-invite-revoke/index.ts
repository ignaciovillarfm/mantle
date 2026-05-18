import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders, errorResponse, jsonResponse } from "../_shared/http.ts";
import { createServiceClient, createUserClient } from "../_shared/supabase.ts";
import { getUserWardRoles, requireUser } from "../_shared/authz.ts";
import { writeAudit } from "../_shared/audit.ts";
import { rateLimitUser } from "../_shared/rateLimit.ts";

const LEADERSHIP = new Set(["bishop", "counselor", "clerk"]);

type Body = { invite_id?: string };

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
    const inviteId = body.invite_id?.trim();
    if (!inviteId) return errorResponse("invite_id required", 400);

    const service = createServiceClient();
    const { data: invite, error: invErr } = await service
      .from("ward_invites")
      .select("id, ward_id, status")
      .eq("id", inviteId)
      .maybeSingle();
    if (invErr || !invite) return errorResponse("Invite not found", 404);
    if (invite.status !== "pending") {
      return errorResponse("Only pending invites can be revoked", 400);
    }

    const actorWards = await getUserWardRoles(userSb, actor.id);
    if (
      !actorWards.some(
        (r) => r.ward_id === invite.ward_id && LEADERSHIP.has(r.role),
      )
    ) {
      return errorResponse("Forbidden", 403);
    }

    const { error: upErr } = await service
      .from("ward_invites")
      .update({ status: "revoked" })
      .eq("id", inviteId)
      .eq("status", "pending");
    if (upErr) throw upErr;

    await writeAudit(service, {
      user_id: actor.id,
      action: "ward_invite_revoke",
      table_name: "ward_invites",
      record_id: inviteId,
      ward_id: invite.ward_id as string,
    });

    return jsonResponse({ ok: true });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error(e);
    return errorResponse("Internal error", 500);
  }
});
