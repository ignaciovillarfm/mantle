import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders, errorResponse, jsonResponse } from "../_shared/http.ts";
import { createServiceClient, createUserClient } from "../_shared/supabase.ts";
import { getUserWardRoles, requireRoles, requireUser } from "../_shared/authz.ts";
import { writeAudit } from "../_shared/audit.ts";
import { rateLimitUser } from "../_shared/rateLimit.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "GET" && req.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }

  try {
    const userSb = createUserClient(req);
    const user = await requireUser(userSb);
    if (!rateLimitUser(user.id)) {
      return errorResponse("Rate limit exceeded", 429);
    }
    await requireRoles(userSb, user.id, ["bishop", "counselor"]);
    const wardRoles = await getUserWardRoles(userSb, user.id);
    const wardId = wardRoles.find((r) => r.role === "bishop" || r.role === "counselor")?.ward_id;
    if (!wardId) return errorResponse("No ward assigned", 403);

    const today = new Date();
    const end = new Date(today);
    end.setUTCDate(end.getUTCDate() + 60);
    const startStr = today.toISOString().slice(0, 10);
    const endStr = end.toISOString().slice(0, 10);

    const { data: rows, error } = await userSb
      .from("temple_recommends")
      .select(
        "expiration_date, last_interview_date, member_id, members ( name )",
      )
      .gte("expiration_date", startStr)
      .lte("expiration_date", endStr)
      .order("expiration_date", { ascending: true });

    if (error) throw error;

    const result = (rows ?? []).map((r: Record<string, unknown>) => {
      const m = r.members as { name: string } | null;
      return {
        member_name: m?.name ?? "Unknown",
        expiration_date: r.expiration_date,
        last_interview_date: r.last_interview_date,
      };
    });

    const service = createServiceClient();
    await writeAudit(service, {
      user_id: user.id,
      action: "get_expiring_recommends",
      table_name: "temple_recommends",
      record_id: null,
      ward_id: wardId,
    });

    return jsonResponse({ recommends: result });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error(e);
    return errorResponse("Internal error", 500);
  }
});
