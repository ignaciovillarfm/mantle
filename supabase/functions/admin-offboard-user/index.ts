import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders, errorResponse, jsonResponse } from "../_shared/http.ts";
import { createServiceClient, createUserClient } from "../_shared/supabase.ts";
import { getUserWardRoles, requireRoles, requireUser } from "../_shared/authz.ts";
import { writeAudit } from "../_shared/audit.ts";
import { rateLimitUser } from "../_shared/rateLimit.ts";

type Body = { user_id?: string };

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
    await requireRoles(userSb, actor.id, ["bishop"]);

    const body = (await req.json()) as Body;
    if (!body.user_id) return errorResponse("user_id required", 400);
    if (body.user_id === actor.id) {
      return errorResponse("Cannot offboard self", 400);
    }

    const service = createServiceClient();
    const actorWardIds = (await getUserWardRoles(userSb, actor.id))
      .filter((r) => r.role === "bishop")
      .map((r) => r.ward_id);
    if (actorWardIds.length === 0) return errorResponse("No ward assigned", 403);

    const { data: targetRoles, error: trErr } = await service
      .from("user_roles")
      .select("ward_id")
      .eq("user_id", body.user_id);
    if (trErr || !targetRoles || targetRoles.length === 0) {
      return errorResponse("Target user has no ward assignment", 404);
    }
    const sharesWard = targetRoles.some((r) =>
      actorWardIds.includes(r.ward_id as string)
    );
    if (!sharesWard) return errorResponse("Forbidden", 403);

    const { data: profile, error: pErr } = await service
      .from("profiles")
      .select("session_version")
      .eq("id", body.user_id)
      .maybeSingle();
    if (pErr || !profile) return errorResponse("Profile not found", 404);

    const next = (profile.session_version ?? 1) + 1;
    const { error: uErr } = await service
      .from("profiles")
      .update({ session_version: next })
      .eq("id", body.user_id);
    if (uErr) throw uErr;

    await writeAudit(service, {
      user_id: actor.id,
      action: "admin_offboard_user",
      table_name: "profiles",
      record_id: body.user_id,
      ward_id: actorWardIds[0],
    });

    return jsonResponse({ ok: true, session_version: next });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error(e);
    return errorResponse("Internal error", 500);
  }
});
