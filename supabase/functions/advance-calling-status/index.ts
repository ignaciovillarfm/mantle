import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders, errorResponse, jsonResponse } from "../_shared/http.ts";
import { createServiceClient, createUserClient } from "../_shared/supabase.ts";
import { getUserWardRoles, requireUser } from "../_shared/authz.ts";
import { writeAudit } from "../_shared/audit.ts";
import { rateLimitUser } from "../_shared/rateLimit.ts";
import { assertAllowedTransition, nextCallingStatus } from "../_shared/callingTransitions.ts";

type Body = { calling_id?: string; new_status?: string };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }

  try {
    const userSb = createUserClient(req);
    const user = await requireUser(userSb);
    if (!rateLimitUser(user.id)) {
      return errorResponse("Rate limit exceeded", 429);
    }

    const body = (await req.json()) as Body;
    if (!body.calling_id) {
      return errorResponse("calling_id required", 400);
    }

    const service = createServiceClient();
    const { data: calling, error: cErr } = await service
      .from("callings")
      .select("id, status, assigned_counselor, ward_id")
      .eq("id", body.calling_id)
      .maybeSingle();
    if (cErr || !calling) return errorResponse("Calling not found", 404);

    const wardRoles = await getUserWardRoles(userSb, user.id);
    const roleInWard = wardRoles.find((r) => r.ward_id === calling.ward_id);
    const isBishop = roleInWard?.role === "bishop";
    const isCounselor = roleInWard?.role === "counselor";
    if (!isBishop && !isCounselor) return errorResponse("Forbidden", 403);
    if (!isBishop && calling.assigned_counselor !== user.id) {
      return errorResponse("Forbidden", 403);
    }

    const proposedNext =
      typeof body.new_status === "string" && body.new_status.length > 0
        ? body.new_status
        : nextCallingStatus(calling.status as string);
    if (!proposedNext) {
      return errorResponse("No next status (already at final step)", 400);
    }
    let nextStatus: string;
    try {
      nextStatus = assertAllowedTransition(calling.status, proposedNext);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Invalid transition";
      return errorResponse(msg, 400);
    }

    const { error: hErr } = await service.from("calling_history").insert({
      calling_id: calling.id,
      old_status: calling.status,
      new_status: nextStatus,
      changed_by: user.id,
      ward_id: calling.ward_id,
    });
    if (hErr) throw hErr;

    const { error: uErr } = await service
      .from("callings")
      .update({ status: nextStatus })
      .eq("id", calling.id);
    if (uErr) throw uErr;

    await writeAudit(service, {
      user_id: user.id,
      action: "advance_calling_status",
      table_name: "callings",
      record_id: calling.id,
      ward_id: calling.ward_id,
    });

    const nextAfterThis = nextCallingStatus(nextStatus);
    return jsonResponse({
      ok: true,
      status: nextStatus,
      next_status_after: nextAfterThis,
    });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error(e);
    return errorResponse("Internal error", 500);
  }
});
