import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders, errorResponse, jsonResponse } from "../_shared/http.ts";
import { createServiceClient, createUserClient } from "../_shared/supabase.ts";
import { getUserWardRoles, requireUser } from "../_shared/authz.ts";

const LEADERSHIP = new Set(["bishop", "counselor", "clerk"]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "GET" && req.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }

  try {
    const userSb = createUserClient(req);
    const actor = await requireUser(userSb);

    let wardId: string | undefined;
    if (req.method === "GET") {
      wardId = new URL(req.url).searchParams.get("ward_id")?.trim() ?? undefined;
    } else {
      const body = (await req.json()) as { ward_id?: string };
      wardId = body.ward_id?.trim();
    }
    if (!wardId) return errorResponse("ward_id required", 400);

    const actorWards = await getUserWardRoles(userSb, actor.id);
    if (!actorWards.some((r) => r.ward_id === wardId && LEADERSHIP.has(r.role))) {
      return errorResponse("Forbidden", 403);
    }

    const service = createServiceClient();
    const { data: invites, error } = await service
      .from("ward_invites")
      .select(
        "id, email, role, status, token, expires_at, created_at, accepted_at, invited_by",
      )
      .eq("ward_id", wardId)
      .in("status", ["pending", "accepted", "revoked"])
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw error;

    return jsonResponse({ ok: true, invites: invites ?? [] });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error(e);
    return errorResponse("Internal error", 500);
  }
});
