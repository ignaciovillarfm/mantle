import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders, errorResponse, jsonResponse } from "../_shared/http.ts";
import { createServiceClient } from "../_shared/supabase.ts";
import { writeAudit } from "../_shared/audit.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }

  const secret = Deno.env.get("CRON_SECRET");
  const hdr = req.headers.get("x-cron-secret");
  if (!secret || hdr !== secret) {
    return errorResponse("Unauthorized", 401);
  }

  try {
    const service = createServiceClient();
    const now = new Date().toISOString();
    const { data: doomed, error: selErr } = await service
      .from("bishop_notes")
      .select("id")
      .not("expires_at", "is", null)
      .lt("expires_at", now);
    if (selErr) throw selErr;

    const ids = (doomed ?? []).map((r) => r.id as string);
    if (ids.length === 0) {
      return jsonResponse({ deleted: 0 });
    }

    const { error: delErr } = await service.from("bishop_notes").delete().in(
      "id",
      ids,
    );
    if (delErr) throw delErr;

    await writeAudit(service, {
      user_id: null,
      action: "bishop_notes_purge_expired",
      table_name: "bishop_notes",
      record_id: null,
      ward_id: null,
    });

    return jsonResponse({ deleted: ids.length });
  } catch (e) {
    console.error(e);
    return errorResponse("Internal error", 500);
  }
});
